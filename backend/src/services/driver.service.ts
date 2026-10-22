import { driverRepository } from '../repositories/driver.repository';
import { NotFoundError, ValidationError } from '../utils/errors';
import db from '../config/database';
import * as argon2 from 'argon2';
import { randomBytes, randomUUID } from 'crypto';
import path from 'path';
import { getStorageService } from './storage.service';
import { profilePhotoMimeType, validateProfilePhoto } from '../utils/profile-photo';

export class DriverService {
  private normalizeDriverData(data: any = {}) {
    const { company_id, ...safeData } = data;
    return {
      ...safeData,
      company_id: company_id ?? null,
    };
  }

  async getAll(companyId: string, pagination: any) {
    const data = await driverRepository.findAll(companyId, pagination);
    const total = await driverRepository.count(companyId);
    return { data: data.map((driver: { profile_photo_key?: string | null }) => this.withoutProfilePhotoKey(driver)), total };
  }

  async getById(companyId: string, id: string) {
    const driver = await driverRepository.findById(companyId, id);
    if (!driver) throw new NotFoundError('Driver not found');
    return this.withoutProfilePhotoKey({
      ...driver,
      compensation_rates: await db('driver_compensation_rates').where({ driver_id: id }).orderBy('load_type'),
    });
  }

  private withoutProfilePhotoKey<T extends { profile_photo_key?: string | null }>(driver: T) {
    const { profile_photo_key, ...publicProfile } = driver;
    return { ...publicProfile, has_profile_photo: Boolean(profile_photo_key) };
  }

  async getByUserId(companyId: string, userId: string) {
    const driver = await driverRepository.findByUserId(companyId, userId);
    if (!driver) throw new NotFoundError('Driver profile not found');
    return this.withoutProfilePhotoKey(driver);
  }

  async uploadMyProfilePhoto(companyId: string, userId: string, buffer: Buffer, declaredMimeType: string) {
    const { extension } = await validateProfilePhoto(buffer, declaredMimeType);
    const driver = await driverRepository.findByUserId(companyId, userId);
    if (!driver) throw new NotFoundError('Driver profile not found');

    const storageKey = path.posix.join(companyId, 'driver-profile', driver.id, `${randomUUID()}.${extension}`);
    const storage = getStorageService();
    await storage.saveBuffer(storageKey, buffer);

    try {
      const updated = await driverRepository.updateProfilePhotoKey(companyId, driver.id, storageKey);
      if (!updated) throw new NotFoundError('Driver profile not found');
    } catch (error) {
      try {
        await storage.deleteFile(storageKey);
      } catch {
        console.error('Unable to clean up an unreferenced driver profile photo');
      }
      throw error;
    }

    if (driver.profile_photo_key) {
      try {
        const ownPhotoPrefix = `${path.posix.join(companyId, 'driver-profile', driver.id)}/`;
        if (driver.profile_photo_key.startsWith(ownPhotoPrefix)) {
          await storage.deleteFile(driver.profile_photo_key);
        }
      } catch {
        console.error('Unable to remove a replaced driver profile photo');
      }
    }

    return { has_profile_photo: true };
  }

  async getMyProfilePhoto(companyId: string, userId: string) {
    const driver = await driverRepository.findByUserId(companyId, userId);
    if (!driver) throw new NotFoundError('Driver profile not found');
    if (!driver.profile_photo_key) throw new NotFoundError('Profile photo not found');
    const ownPhotoPrefix = `${path.posix.join(companyId, 'driver-profile', driver.id)}/`;
    if (!driver.profile_photo_key.startsWith(ownPhotoPrefix)) throw new NotFoundError('Profile photo not found');

    try {
      const mimeType = profilePhotoMimeType(driver.profile_photo_key);
      return {
        stream: getStorageService().getFileStream(driver.profile_photo_key),
        mimeType,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT' || (error as Error).message === 'File not found in storage') {
        throw new NotFoundError('Profile photo not found');
      }
      throw error;
    }
  }

  async create(companyId: string | undefined, data: any) {
    if (!companyId) throw new ValidationError('A company is required to create a driver');

    const required = ['first_name', 'last_name', 'license_number'];
    for (const field of required) {
      if (!data[field] || !data[field].toString().trim()) {
        throw new ValidationError(`${field.replace(/_/g, ' ')} is required`);
      }
    }

    if (data.email && !this.isValidEmail(data.email)) {
      throw new ValidationError('Invalid email format');
    }

    if (data.truck_id !== undefined && data.truck_id !== null && data.truck_id !== '') {
      const truckValue = String(data.truck_id).trim();
      if (!this.isUuid(truckValue)) {
        const truck = await db('trucks')
          .where({ company_id: companyId, unit_number: truckValue })
          .first('id');
        if (!truck) throw new ValidationError('The selected truck was not found in this company');
        data.truck_id = truck.id;
      }
    }

    this.validateCompensation(data);
    const { compensation_rates, ...driverData } = data;

    const normalized = this.normalizeDriverData({ ...driverData, user_id: driverData.user_id ?? null, company_id: companyId });
    const payload = {
      ...normalized,
      status: (driverData.status || 'ACTIVE').toString().toUpperCase(),
    };

    if (typeof (db as any).transaction !== 'function') {
      return this.withoutProfilePhotoKey(await driverRepository.create(companyId ?? null, payload));
    }

    return db.transaction(async (trx) => {
      const role = await trx('roles').where({ name: 'DRIVER' }).first('id');
      if (!role) throw new NotFoundError('DRIVER role is not configured');

      if (driverData.truck_id) {
        const truck = await trx('trucks').where({ id: driverData.truck_id, company_id: companyId }).first('id');
        if (!truck) throw new ValidationError('The selected truck does not belong to this company');
      }

      let portalUser: any = null;
      if (driverData.user_id) {
        portalUser = await trx('users')
          .where({ id: driverData.user_id, company_id: companyId, role_id: role.id })
          .first();
        if (!portalUser) throw new ValidationError('The selected portal account is not a Driver in this company');
      } else if (driverData.email) {
        const normalizedEmail = String(driverData.email).trim().toLowerCase();
        await trx.raw('SELECT pg_advisory_xact_lock(hashtext(?))', [normalizedEmail]);
        portalUser = await trx('users')
          .where({ company_id: companyId })
          .whereRaw('LOWER(email) = ?', [normalizedEmail])
          .first();
        if (portalUser && portalUser.role_id !== role.id) {
          throw new ValidationError('That email is already used by a non-Driver account');
        }
        if (!portalUser) {
          const existingAccount = await trx('users').whereRaw('LOWER(email) = ?', [normalizedEmail]).first('id');
          if (existingAccount) throw new ValidationError('An account with this email already exists');
        }
        driverData.email = normalizedEmail;
      }

      let temporaryPassword: string | undefined;
      if (!portalUser) {
        temporaryPassword = this.generateTemporaryPassword();
        const [createdUser] = await trx('users').insert({
          company_id: companyId,
          role_id: role.id,
          email: driverData.email,
          password_hash: await argon2.hash(temporaryPassword),
          first_name: driverData.first_name,
          last_name: driverData.last_name,
          phone: driverData.phone || null,
          status: 'ACTIVE',
          must_change_password: true,
        }).returning('*');
        portalUser = createdUser;
      }

      normalized.user_id = portalUser.id;
      payload.user_id = portalUser.id;
      const [driver] = await trx('drivers').insert(payload).returning('*');
      await this.replaceCompensationRates(trx, driver.id, compensation_rates);
      await trx('drivers').where({ id: driver.id }).update({ user_id: portalUser.id });
      return {
        driver: this.withoutProfilePhotoKey({
          ...driver,
          user_id: portalUser.id,
          compensation_rates: await trx('driver_compensation_rates').where({ driver_id: driver.id }),
        }),
        portalAccess: {
          email: portalUser.email,
          temporaryPassword,
          mustChangePassword: Boolean(portalUser.must_change_password || temporaryPassword),
        },
      };
    });
  }

  private generateTemporaryPassword(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    const bytes = randomBytes(18);
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  }

  async resetPortalPassword(companyId: string, driverId: string) {
    return db.transaction(async (trx) => {
      const driver = await trx('drivers').where({ id: driverId, company_id: companyId }).first();
      if (!driver || !driver.user_id) throw new NotFoundError('Driver portal account not found');
      const temporaryPassword = this.generateTemporaryPassword();
      await trx('users').where({ id: driver.user_id, company_id: companyId }).update({
        password_hash: await argon2.hash(temporaryPassword),
        must_change_password: true,
        status: 'ACTIVE',
        updated_at: trx.fn.now(),
      });
      return { email: driver.email, temporaryPassword, mustChangePassword: true };
    });
  }

  async synchronizeDriverAccounts(companyId?: string) {
    const driversQuery = db('drivers').select('drivers.*').orderBy('drivers.created_at', 'asc');
    if (companyId) driversQuery.where('drivers.company_id', companyId);
    const drivers = await driversQuery;
    const role = await db('roles').where({ name: 'DRIVER' }).first('id');
    if (!role) throw new NotFoundError('DRIVER role is not configured');

    const report = {
      totalDrivers: drivers.length,
      initialDriverAccounts: 0,
      driverAccounts: 0,
      unlinkedDriverAccounts: 0,
      linkedDrivers: 0,
      missingAccounts: 0,
      accountsCreated: 0,
      ambiguousMatches: [] as Array<{ driverId: string; reason: string }>,
      duplicateAccounts: [] as Array<{ driverId: string; userIds: string[] }>,
      createdCredentials: [] as Array<{ driverId: string; email: string; temporaryPassword: string }>,
    };

    const countDriverAccounts = async () => db('users as u')
      .join('roles as r', 'r.id', 'u.role_id')
      .modify((query) => {
        if (companyId) query.where('u.company_id', companyId);
      })
      .where('r.name', 'DRIVER')
      .count('u.id')
      .first()
      .then((result: any) => Number(result?.count || 0));
    report.initialDriverAccounts = await countDriverAccounts();

    for (const driver of drivers) {
      if (driver.user_id) {
        const linkedUser = await db('users as u')
          .join('roles as r', 'r.id', 'u.role_id')
          .where({ 'u.id': driver.user_id, 'u.company_id': driver.company_id, 'r.name': 'DRIVER' })
          .first('u.id');
        if (linkedUser) {
          report.linkedDrivers += 1;
          continue;
        }
        report.ambiguousMatches.push({ driverId: driver.id, reason: 'Existing user_id does not reference an active DRIVER account in the same company' });
        continue;
      }

      if (!driver.email) {
        report.missingAccounts += 1;
        report.ambiguousMatches.push({ driverId: driver.id, reason: 'Driver has no email; account cannot be created safely' });
        continue;
      }

      const candidates = await db('users as u')
        .leftJoin('roles as r', 'r.id', 'u.role_id')
        .where('u.company_id', driver.company_id)
        .whereRaw('LOWER(u.email) = LOWER(?)', [driver.email.trim()])
        .select('u.id', 'u.role_id', 'r.name as role');
      const driverCandidates = candidates.filter((candidate: any) => candidate.role === 'DRIVER');
      if (candidates.some((candidate: any) => candidate.role !== 'DRIVER')) {
        report.missingAccounts += 1;
        report.ambiguousMatches.push({ driverId: driver.id, reason: 'Email belongs to a non-DRIVER account' });
        continue;
      }
      if (driverCandidates.length > 1) {
        report.missingAccounts += 1;
        report.duplicateAccounts.push({ driverId: driver.id, userIds: driverCandidates.map((candidate: any) => candidate.id) });
        continue;
      }
      if (driverCandidates.length === 1) {
        const linkedDriver = await db('drivers').where({ user_id: driverCandidates[0].id }).whereNot({ id: driver.id }).first('id');
        if (linkedDriver) {
          report.missingAccounts += 1;
          report.ambiguousMatches.push({ driverId: driver.id, reason: `Matching DRIVER account is already linked to driver ${linkedDriver.id}` });
          continue;
        }
        await db('drivers').where({ id: driver.id }).update({ user_id: driverCandidates[0].id, updated_at: db.fn.now() });
        report.linkedDrivers += 1;
        continue;
      }

      const temporaryPassword = this.generateTemporaryPassword();
      const [createdUser] = await db('users').insert({
        company_id: driver.company_id,
        role_id: role.id,
        email: driver.email.trim(),
        password_hash: await argon2.hash(temporaryPassword),
        first_name: driver.first_name,
        last_name: driver.last_name,
        phone: driver.phone || null,
        status: 'ACTIVE',
        must_change_password: true,
      }).returning('id');
      await db('drivers').where({ id: driver.id }).update({ user_id: createdUser.id, updated_at: db.fn.now() });
      report.accountsCreated += 1;
      report.linkedDrivers += 1;
      report.createdCredentials.push({ driverId: driver.id, email: driver.email.trim(), temporaryPassword });
    }

    report.driverAccounts = await countDriverAccounts();
    report.unlinkedDriverAccounts = await db('users as u')
      .join('roles as r', 'r.id', 'u.role_id')
      .leftJoin('drivers as d', 'd.user_id', 'u.id')
      .modify((query) => {
        if (companyId) query.where('u.company_id', companyId);
      })
      .where('r.name', 'DRIVER')
      .whereNull('d.id')
      .count('u.id')
      .first()
      .then((result: any) => Number(result?.count || 0));

    return report;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  async update(companyId: string, id: string, data: any) {
    const existing = await driverRepository.findById(companyId, id);
    if (!existing) throw new NotFoundError('Driver not found');

    const { company_id, compensation_rates, ...safeData } = data ?? {};
    this.validateCompensation(safeData);
    return db.transaction(async (trx) => {
      if (safeData.truck_id) {
        const truck = await trx('trucks').where({ id: safeData.truck_id, company_id }).first('id');
        if (!truck) throw new ValidationError('The selected truck does not belong to this company');
      }
      if (safeData.user_id) {
        const role = await trx('roles').where({ name: 'DRIVER' }).first('id');
        const user = role && await trx('users')
          .where({ id: safeData.user_id, company_id, role_id: role.id })
          .first('id');
        if (!user) throw new ValidationError('The selected portal account is not a Driver in this company');
      }
      const activeAssignment = await trx('load_assignments as la')
        .join('loads as l', 'l.id', 'la.load_id')
        .where('la.driver_id', id)
        .where('l.company_id', companyId)
        .where('la.is_active', true)
        .whereIn('l.status', ['pending', 'dispatched', 'in_transit'])
        .first('la.id');
      const updateData = {
        ...safeData,
        ...(activeAssignment ? { status: 'ASSIGNED' } : {}),
      };
      const [driver] = await trx('drivers')
        .where({ id, company_id: companyId })
        .update({ ...updateData, compensation_rates: undefined, updated_at: trx.fn.now() })
        .returning('*');
      if (compensation_rates !== undefined) {
        await this.replaceCompensationRates(trx, id, compensation_rates);
      }
      return this.withoutProfilePhotoKey({
        ...driver,
        compensation_rates: await trx('driver_compensation_rates').where({ driver_id: id }),
      });
    });
  }

  private validateCompensation(data: any) {
    const defaultRate = data.default_compensation_rate;
    if (defaultRate !== undefined && defaultRate !== null && (!Number.isFinite(Number(defaultRate)) || Number(defaultRate) < 0)) {
      throw new ValidationError('Default compensation rate must be a non-negative number');
    }
    if (data.default_compensation_type === 'PERCENT_OF_RATE' && Number(defaultRate) > 100) {
      throw new ValidationError('Default compensation percentage cannot exceed 100');
    }
    for (const rate of data.compensation_rates || []) {
      if (rate.rate !== null && (!Number.isFinite(Number(rate.rate)) || Number(rate.rate) < 0)) {
        throw new ValidationError(`Invalid compensation rate for ${rate.load_type}`);
      }
      if (rate.pay_type === 'PERCENT_OF_RATE' && Number(rate.rate) > 100) {
        throw new ValidationError(`Compensation percentage for ${rate.load_type} cannot exceed 100`);
      }
    }
  }

  private async replaceCompensationRates(trx: any, driverId: string, rates: any[] = []) {
    await trx('driver_compensation_rates').where({ driver_id: driverId }).delete();
    if (rates.length) {
      await trx('driver_compensation_rates').insert(rates.map((rate) => ({ ...rate, driver_id: driverId })));
    }
  }

  async delete(companyId: string, id: string) {
    const existing = await driverRepository.findById(companyId, id);
    if (!existing) throw new NotFoundError('Driver not found');

    return db.transaction(async (trx) => {
      const [assignment, invoice, settlement, document] = await Promise.all([
        trx('load_assignments').where({ driver_id: id }).first('id'),
        trx('invoices').where({ driver_id: id }).first('id'),
        trx('settlements').where({ driver_id: id }).first('id'),
        trx('documents as doc')
          .join('load_assignments as la', 'la.load_id', 'doc.load_id')
          .where('la.driver_id', id)
          .first('doc.id'),
      ]);
      const hasHistory = Boolean(assignment || invoice || settlement || document);

      if (hasHistory) {
        await trx('drivers').where({ id, company_id: companyId }).update({
          status: 'INACTIVE',
          updated_at: trx.fn.now(),
        });
        if (existing.user_id) {
          await trx('users').where({ id: existing.user_id, company_id: companyId }).update({
            status: 'INACTIVE',
            updated_at: trx.fn.now(),
          });
        }
        return { deleted: false, archived: true, message: 'Driver archived because historical records must be preserved' };
      }

      await trx('drivers').where({ id, company_id: companyId }).delete();
      if (existing.user_id) {
        const linkedDriver = await trx('drivers').where({ user_id: existing.user_id }).first('id');
        if (!linkedDriver) {
          await trx('users').where({ id: existing.user_id, company_id: companyId }).delete();
        }
      }
      return { deleted: true, archived: false, message: 'Driver and unused portal account deleted' };
    });
  }

  async linkUserAccount(companyId: string, id: string, userId: string) {
    return this.update(companyId, id, { user_id: userId });
  }

  async unlinkUserAccount(companyId: string, id: string) {
    return this.update(companyId, id, { user_id: null });
  }
}

export const driverService = new DriverService();
