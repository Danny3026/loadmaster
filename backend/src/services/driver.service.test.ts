import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DriverService } from './driver.service';
import { driverRepository } from '../repositories/driver.repository';
import db from '../config/database';

vi.mock('../config/database', () => ({
  default: vi.fn(),
}));

vi.mock('../repositories/driver.repository', () => ({
  driverRepository: {
    create: vi.fn(),
    findAll: vi.fn(),
    count: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('DriverService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a driver without requiring optional contact/location fields', async () => {
    const service = new DriverService();
    const createSpy = vi.mocked(driverRepository.create);
    const dbMock = vi.mocked(db as any);
    const truckLookup = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ id: 'truck-1' }),
    };
    dbMock.mockReturnValueOnce(truckLookup as any);
    createSpy.mockResolvedValue({
      id: 'driver-1',
      first_name: 'Daniel',
      last_name: 'Gift',
      license_number: 'CDL-45672',
      status: 'ACTIVE',
      company_id: 'company-1',
    } as any);

    const result = await service.create('company-1', {
      first_name: 'Daniel',
      last_name: 'Gift',
      license_number: 'CDL-45672',
      status: 'active',
      truck_id: 'TRK-101',
      trailer_number: 'TRL-202',
      current_city: 'Atlanta',
      current_state: 'GA',
      mailing_address: '123 Main St',
      mailing_city: 'Dallas',
      mailing_state: 'TX',
      mailing_zip: '75001',
      notes: 'Test driver',
    });

    expect(result).toEqual(expect.objectContaining({ first_name: 'Daniel' }));
    expect(createSpy).toHaveBeenCalledWith('company-1', expect.objectContaining({
      company_id: 'company-1',
      truck_id: 'truck-1',
      status: 'ACTIVE',
      trailer_number: 'TRL-202',
      current_city: 'Atlanta',
      current_state: 'GA',
      mailing_address: '123 Main St',
      mailing_city: 'Dallas',
      mailing_state: 'TX',
      mailing_zip: '75001',
    }));
    expect(dbMock).toHaveBeenCalledWith('trucks');
    expect(truckLookup.where).toHaveBeenCalledWith({ company_id: 'company-1', unit_number: 'TRK-101' });
  });

  it('rejects a truck unit number that does not belong to the driver company', async () => {
    const service = new DriverService();
    const createSpy = vi.mocked(driverRepository.create);
    const truckLookup = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
    };
    vi.mocked(db as any).mockReturnValueOnce(truckLookup as any);

    await expect(service.create('company-1', {
      first_name: 'Jordan',
      last_name: 'Taylor',
      license_number: 'CDL-98765',
      email: 'jordan@example.com',
      truck_id: 'UNIT-OUTSIDE-COMPANY',
    })).rejects.toThrow('The selected truck was not found in this company');

    expect(truckLookup.where).toHaveBeenCalledWith({
      company_id: 'company-1',
      unit_number: 'UNIT-OUTSIDE-COMPANY',
    });
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('rejects a truck UUID that does not belong to the driver company', async () => {
    const service = new DriverService();
    const truckLookup = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
    };
    const roleLookup = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ id: 'driver-role' }),
    };
    const trx = (table: string) => {
      if (table === 'roles') return roleLookup;
      if (table === 'trucks') return truckLookup;
      throw new Error(`Unexpected table ${table}`);
    };
    (db as any).transaction = vi.fn(async (callback: (transaction: typeof trx) => unknown) => callback(trx));

    await expect(service.create('company-1', {
      first_name: 'Jordan',
      last_name: 'Taylor',
      license_number: 'CDL-98765',
      email: 'jordan@example.com',
      truck_id: '11111111-1111-4111-8111-111111111111',
    })).rejects.toThrow('The selected truck does not belong to this company');

    expect(truckLookup.where).toHaveBeenCalledWith({
      id: '11111111-1111-4111-8111-111111111111',
      company_id: 'company-1',
    });
    expect(driverRepository.create).not.toHaveBeenCalled();
  });

  it('rejects driver creation without a company context', async () => {
    const service = new DriverService();
    const createSpy = vi.mocked(driverRepository.create);
    await expect(service.create('', {
      first_name: 'Daniel',
      last_name: 'Gift',
      license_number: 'CDL-12345',
      email: 'daniel@example.com',
    })).rejects.toThrow('A company is required to create a driver');
    expect(createSpy).not.toHaveBeenCalled();
    expect(db).not.toHaveBeenCalled();
  });
});

describe('DriverService.update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps an assigned driver On Duty when profile save submits ACTIVE', async () => {
    const service = new DriverService();
    vi.mocked(driverRepository.findById).mockResolvedValue({
      id: 'driver-1',
      company_id: 'company-1',
      status: 'ACTIVE',
    } as any);

    const assignmentQuery: any = {
      join: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      whereIn: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ id: 'assignment-1' }),
    };
    const driverQuery: any = {
      where: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{
        id: 'driver-1',
        status: 'ASSIGNED',
      }]),
    };
    const compensationRatesQuery: any = {
      where: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown[]) => unknown) => Promise.resolve([]).then(resolve),
    };
    const trx: any = (table: string) => {
      if (table === 'load_assignments as la') return assignmentQuery;
      if (table === 'drivers') return driverQuery;
      if (table === 'driver_compensation_rates') return compensationRatesQuery;
      throw new Error(`Unexpected table ${table}`);
    };
    trx.fn = { now: vi.fn() };
    (db as any).transaction = vi.fn(async (callback: (trx: any) => unknown) => callback(trx));

    const result = await service.update('company-1', 'driver-1', {
      first_name: 'Alpha',
      status: 'ACTIVE',
    });

    expect(driverQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      first_name: 'Alpha',
      status: 'ASSIGNED',
    }));
    expect(result).toMatchObject({ status: 'ASSIGNED' });
  });
});
