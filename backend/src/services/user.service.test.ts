import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserService } from './user.service';
import db from '../config/database';
import { userRepository } from '../repositories/user.repository';

vi.mock('../config/database', () => ({
  default: vi.fn(),
}));

vi.mock('../repositories/user.repository', () => ({
  userRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('UserService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts a password and title-case role names without requiring company fields', async () => {
    const service = new UserService();

    const usersTable = {
      whereRaw: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      }),
      where: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      }),
    };

    const rolesTable = {
      where: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'role-1', name: 'DISPATCHER' }),
      }),
    };

    vi.mocked(db as any).mockImplementation((table: string) => {
      if (table === 'users') return usersTable;
      if (table === 'roles') return rolesTable;
      return {
        where: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(null) }),
      };
    });

    vi.mocked(userRepository.create).mockResolvedValue({
      id: 'user-1',
      email: 'daniel@example.com',
      firstName: 'Daniel',
      lastName: 'Gift',
      role: 'DISPATCHER',
    } as any);

    const result = await service.create('company-1', {
      first_name: 'Daniel',
      last_name: 'Gift',
      email: 'daniel@example.com',
      password: 'Temp@12345',
      role: 'Dispatcher',
      phone: '5553457908',
      pay_percentage: 10,
    });

    expect(result).toEqual(expect.objectContaining({ email: 'daniel@example.com' }));
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'daniel@example.com',
        company_id: 'company-1',
        role_id: 'role-1',
      })
    );
  });

  it('creates a driver profile for a newly created driver team member when none exists yet', async () => {
    const service = new UserService();

    const usersTable = {
      whereRaw: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      }),
      where: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      }),
    };

    const rolesTable = {
      where: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'role-driver', name: 'DRIVER' }),
      }),
    };

    const driversTable = {
      where: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
        first: vi.fn().mockResolvedValue(null),
      })),
      insert: vi.fn().mockResolvedValue([{}]),
    };

    vi.mocked(db as any).mockImplementation((table: string) => {
      if (table === 'users') return usersTable;
      if (table === 'roles') return rolesTable;
      if (table === 'drivers') return driversTable;
      return {
        where: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(null) }),
      };
    });

    vi.mocked(userRepository.create).mockResolvedValue({
      id: 'driver-user-1',
      email: 'john.testdriver@example.com',
      firstName: 'John',
      lastName: 'TestDriver',
      role: 'DRIVER',
      company_id: 'company-1',
    } as any);

    await service.create('company-1', {
      first_name: 'John',
      last_name: 'TestDriver',
      email: 'john.testdriver@example.com',
      password: 'Temp@12345',
      role: 'DRIVER',
      phone: '5551234567',
    });

    expect(driversTable.insert).toHaveBeenCalledWith(expect.objectContaining({
      company_id: 'company-1',
      user_id: 'driver-user-1',
      first_name: 'John',
      last_name: 'TestDriver',
      email: 'john.testdriver@example.com',
      status: 'ACTIVE',
    }));
  });
});

describe('UserService.getAll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns driver profile compensation alongside team member data', async () => {
    const service = new UserService();
    const joinConditions = {
      on: vi.fn().mockReturnThis(),
      andOn: vi.fn().mockReturnThis(),
    };
    const usersQuery: any = {
      select: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockImplementation((table: string, callback?: (this: any) => void) => {
        if (table === 'drivers') callback?.call(joinConditions);
        return usersQuery;
      }),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      then: (resolve: (value: any[]) => unknown) => Promise.resolve([{
        id: 'alpha-user',
        email: 'alpha@example.com',
        first_name: 'Alpha',
        last_name: 'Mapepele',
        pay_percentage: null,
        driver_compensation_type: 'PERCENT_OF_RATE',
        driver_compensation_rate: '25.0000',
        role: 'DRIVER',
        status: 'ACTIVE',
      }]).then(resolve),
    };
    const countQuery = {
      where: vi.fn().mockReturnThis(),
      count: vi.fn().mockResolvedValue([{ count: '1' }]),
    };
    let usersQueryCount = 0;
    vi.mocked(db as any).mockImplementation((table: string) => {
      if (table !== 'users') throw new Error(`Unexpected table ${table}`);
      usersQueryCount += 1;
      return usersQueryCount === 1 ? usersQuery : countQuery;
    });

    const result = await service.getAll('company-1', { limit: 10, offset: 0 });

    expect(joinConditions.on).toHaveBeenCalledWith('drivers.user_id', '=', 'users.id');
    expect(joinConditions.andOn).toHaveBeenCalledWith('drivers.company_id', '=', 'users.company_id');
    expect(result.data[0]).toMatchObject({
      firstName: 'Alpha',
      driverCompensationType: 'PERCENT_OF_RATE',
      driverCompensationRate: 25,
    });
    expect(result.total).toBe(1);
  });
});

describe('UserService.delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deactivates users with activity history instead of deleting the audit-log owner', async () => {
    const service = new UserService();
    const userQuery: any = {
      select: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ id: 'user-1', role: 'DISPATCHER' }),
      update: vi.fn().mockResolvedValue(1),
      delete: vi.fn(),
    };
    const activityLogsQuery = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ id: 'activity-1' }),
    };
    const trx: any = vi.fn((table: string) => (
      table === 'users' ? userQuery : activityLogsQuery
    ));
    trx.commit = vi.fn().mockResolvedValue(undefined);
    trx.rollback = vi.fn().mockResolvedValue(undefined);
    (db as any).transaction = vi.fn().mockResolvedValue(trx);
    vi.mocked(userRepository.findById).mockResolvedValue({
      id: 'user-1',
      email: 'john@example.com',
    } as any);

    const result = await service.delete('company-1', 'user-1');

    expect(activityLogsQuery.where).toHaveBeenCalledWith({
      user_id: 'user-1',
      company_id: 'company-1',
    });
    expect(userQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'INACTIVE',
    }));
    expect(userQuery.delete).not.toHaveBeenCalled();
    expect(trx.commit).toHaveBeenCalledOnce();
    expect(result.message).toContain('deactivated');
  });
});
