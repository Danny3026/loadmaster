import * as argon2 from 'argon2';
import { userRepository } from '../repositories/user.repository';
import db from '../config/database';
import { NotFoundError, ConflictError } from '../utils/errors';

export class UserService {
  private async ensureDriverProfile(companyId: string, user: any) {
    const email = user.email?.trim();
    const firstName = user.first_name ?? user.firstName;
    const lastName = user.last_name ?? user.lastName;
    if (!email || !firstName || !lastName) return;

    const existingDriver = await db('drivers')
      .where({ company_id: companyId })
      .where(function () {
        this.where({ user_id: user.id }).orWhereILike('email', email);
      })
      .first();

    if (existingDriver) {
      const updateData: any = {
        first_name: firstName,
        last_name: lastName,
        email,
        phone: user.phone || existingDriver.phone,
        status: existingDriver.status || 'ACTIVE',
        company_id: companyId,
        updated_at: db.fn.now(),
      };

      if (existingDriver.user_id !== user.id) {
        updateData.user_id = user.id;
      }

      await db('drivers').where({ id: existingDriver.id }).update(updateData);
      return;
    }

    const now = typeof db.fn?.now === 'function' ? db.fn.now() : new Date();

    await db('drivers').insert({
      company_id: companyId,
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: user.phone || null,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    });
  }

  async getAll(companyId: string, pagination: any = { limit: 10, offset: 0 }) {
    const query = db('users')
      .select(
        'users.id',
        'users.email',
        'users.first_name',
        'users.last_name',
        'users.phone',
        'users.pay_percentage',
        'users.status',
        'users.created_at',
        'users.updated_at',
        'roles.name as role',
        'drivers.default_compensation_type as driver_compensation_type',
        'drivers.default_compensation_rate as driver_compensation_rate'
      )
      .leftJoin('roles', 'users.role_id', 'roles.id')
      .leftJoin('drivers', function () {
        this.on('drivers.user_id', '=', 'users.id')
          .andOn('drivers.company_id', '=', 'users.company_id');
      })
      .where('users.company_id', companyId)
      .limit(pagination.limit)
      .offset(pagination.offset);

    const data = await query;
    const [{ count }] = await db('users').where({ company_id: companyId }).count('id');
    
    return { 
      data: data.map(user => this.formatUser(user)),
      total: parseInt(count as string) 
    };
  }

  private formatUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      payPercentage: user.pay_percentage ? parseFloat(user.pay_percentage) : null,
      driverCompensationType: user.driver_compensation_type || null,
      driverCompensationRate: user.driver_compensation_rate === null || user.driver_compensation_rate === undefined
        ? null
        : parseFloat(user.driver_compensation_rate),
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async getById(companyId: string, id: string) {
    const user = await userRepository.findById(companyId, id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async create(companyId: string, data: any) {
    const email = String(data.email || '').trim().toLowerCase();
    const existing = await db('users').whereRaw('LOWER(email) = ?', [email]).first('id', 'company_id');
    if (existing) throw new ConflictError('An account with this email already exists');

    // Convert role name to role_id if needed
    let roleId = data.role_id;
    if (!data.role_id && data.role) {
      const role = await db('roles').where({ name: data.role }).first();
      if (!role) throw new NotFoundError(`Role ${data.role} not found`);
      roleId = role.id;
    }

    const password_hash = await argon2.hash(data.password);
    const { password, role, ...rest } = data;
    
    const userData = {
      ...rest,
      email,
      role_id: roleId,
      password_hash,
      company_id: companyId,
    };

    const user = await userRepository.create(userData);
    const roleName = String(data.role ?? user.role ?? '').toUpperCase();

    if (roleName === 'DRIVER') {
      await this.ensureDriverProfile(companyId, {
        ...user,
        first_name: user.firstName ?? user.first_name,
        last_name: user.lastName ?? user.last_name,
      });
    }

    return user;
  }

  async update(companyId: string, id: string, data: any) {
    const existing = await userRepository.findById(companyId, id);
    if (!existing) throw new NotFoundError('User not found');

    // Check for duplicate email
    const emailChanged = Boolean(data.email)
      && data.email.trim().toLowerCase() !== String(existing.email).trim().toLowerCase();

    // Prepare update data
    const updateData: any = {};

    // Handle email update
    if (data.email) {
      updateData.email = data.email.trim().toLowerCase();
    }

    // Handle password update
    if (data.password) {
      updateData.password_hash = await argon2.hash(data.password);
    }

    // Handle other fields
    if (data.first_name !== undefined) updateData.first_name = data.first_name;
    if (data.last_name !== undefined) updateData.last_name = data.last_name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.pay_percentage !== undefined) updateData.pay_percentage = data.pay_percentage;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.role_id !== undefined) updateData.role_id = data.role_id;

    // Only update if there's something to update
    if (Object.keys(updateData).length === 0) {
      return existing;
    }

    // Update and add updated_at timestamp
    updateData.updated_at = new Date();

    if (emailChanged) {
      await db.transaction(async (trx) => {
        await trx.raw('SELECT pg_advisory_xact_lock(hashtext(?))', [updateData.email]);
        const duplicateEmail = await trx('users')
          .whereRaw('LOWER(email) = ?', [updateData.email])
          .whereNot('id', id)
          .first('id');
        if (duplicateEmail) throw new ConflictError('An account with this email already exists');
        await trx('users').where({ id, company_id: companyId }).update(updateData);
      });
    } else {
      await db('users').where({ id, company_id: companyId }).update(updateData);
    }

    // Fetch and return the updated user with role
    const user = await db('users')
      .select(
        'users.id',
        'users.email',
        'users.first_name',
        'users.last_name',
        'users.phone',
        'users.pay_percentage',
        'users.status',
        'users.created_at',
        'users.updated_at',
        'roles.name as role'
      )
      .leftJoin('roles', 'users.role_id', 'roles.id')
      .where('users.id', id)
      .first();

    if (!user) throw new NotFoundError('User not found');

    if (String(user.role).toUpperCase() === 'DRIVER') {
      await this.ensureDriverProfile(companyId, user);
    }

    return this.formatUser(user);
  }

  async delete(companyId: string, id: string) {
    const existing = await userRepository.findById(companyId, id);
    if (!existing) throw new NotFoundError('User not found');

    // Use transaction to ensure data integrity
    const trx = await db.transaction();
    try {
      // Check if user has DRIVER role
      const userWithRole = await trx('users')
        .select('users.*', 'roles.name as role')
        .leftJoin('roles', 'users.role_id', 'roles.id')
        .where({ 'users.id': id, 'users.company_id': companyId })
        .first();

      const hasActivityLogs = await trx('activity_logs')
        .where({ user_id: id, company_id: companyId })
        .first();

      if (hasActivityLogs) {
        if (userWithRole?.role === 'DRIVER') {
          await trx('drivers')
            .where({ user_id: id, company_id: companyId })
            .update({ status: 'INACTIVE', updated_at: new Date() });
        }
        await trx('users')
          .where({ id, company_id: companyId })
          .update({ status: 'INACTIVE', updated_at: new Date() });
        await trx.commit();
        return { success: true, message: 'User account deactivated to preserve activity history' };
      }

      if (userWithRole && userWithRole.role === 'DRIVER') {
        // Find associated driver record
        const driver = await trx('drivers')
          .where({ user_id: id, company_id: companyId })
          .first();

        if (driver) {
          // Check if driver has any historical records
          const hasLoads = await trx('loads')
            .where({ company_id: companyId })
            .join('load_assignments', 'loads.id', '=', 'load_assignments.load_id')
            .where({ 'load_assignments.driver_id': driver.id })
            .first();

          const hasInvoices = await trx('invoices')
            .where({ driver_id: driver.id })
            .first();

          const hasSettlements = await trx('settlements')
            .where({ driver_id: driver.id })
            .first();

          const hasDocuments = await trx('documents')
            .where({ 'documents.company_id': companyId })
            .join('loads', 'documents.load_id', '=', 'loads.id')
            .join('load_assignments', 'loads.id', '=', 'load_assignments.load_id')
            .where({ 'load_assignments.driver_id': driver.id })
            .first();

          const hasHistory = !!(hasLoads || hasInvoices || hasSettlements || hasDocuments);

          if (hasHistory) {
            // Preserve the account identity and all historical relationships.
            await trx('drivers')
              .where({ id: driver.id })
              .update({ status: 'INACTIVE', updated_at: new Date() });
            await trx('users')
              .where({ id, company_id: companyId })
              .update({ status: 'INACTIVE', updated_at: new Date() });
            await trx.commit();
            return { success: true, message: 'Driver account deactivated because it has historical records' };
          } else {
            // Safe to delete - no historical records
            await trx('drivers')
              .where({ id: driver.id })
              .delete();
          }
        }
      }

      // Delete the user
      await trx('users')
        .where({ id, company_id: companyId })
        .delete();

      await trx.commit();
      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }
}

export const userService = new UserService();
