import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DriverRepository } from './driver.repository';

const { mockDb, mockQuery, mockScope, mockJoinScope } = vi.hoisted(() => {
  const mockScope = {
    where: vi.fn().mockReturnThis(),
    orWhereNull: vi.fn().mockReturnThis(),
  };
  const mockJoinScope = {
    on: vi.fn().mockReturnThis(),
    andOn: vi.fn().mockReturnThis(),
  };
  const mockQuery: any = {
    leftJoin: vi.fn().mockImplementation((_table: string, join: (this: typeof mockJoinScope) => void) => {
      if (typeof join === 'function') join.call(mockJoinScope);
      return mockQuery;
    }),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation((condition: any) => {
      if (typeof condition === 'function') condition.call(mockScope);
      return mockQuery;
    }),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'driver-a' }]),
    first: vi.fn().mockResolvedValue({ id: 'driver-a', company_id: 'company-a' }),
    then: (resolve: (value: any[]) => unknown) => Promise.resolve([]).then(resolve),
  };
  const mockDb: any = vi.fn(() => mockQuery);
  mockDb.raw = vi.fn(() => 'availability_status');
  mockDb.fn = { now: vi.fn() };
  return { mockDb, mockQuery, mockScope, mockJoinScope };
});

vi.mock('../config/database', () => ({ default: mockDb }));

describe('DriverRepository tenant scope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists only drivers owned by the requested company', async () => {
    const repository = new DriverRepository();

    await repository.findAll('company-a');

    expect(mockQuery.where).toHaveBeenCalledWith('drivers.company_id', 'company-a');
    expect(mockScope.orWhereNull).not.toHaveBeenCalled();
  });

  it('filters driver details by the requested company', async () => {
    const repository = new DriverRepository();

    await repository.findById('company-a', 'driver-b');

    expect(mockQuery.where).toHaveBeenCalledWith({ 'drivers.id': 'driver-b' });
    expect(mockQuery.where).toHaveBeenCalledWith('drivers.company_id', 'company-a');
    expect(mockScope.orWhereNull).not.toHaveBeenCalled();
  });

  it('returns the authenticated driver truck only through a same-company join', async () => {
    const repository = new DriverRepository();

    await repository.findByUserId('company-a', 'user-a');

    expect(mockQuery.where).toHaveBeenCalledWith({ 'drivers.user_id': 'user-a' });
    expect(mockQuery.where).toHaveBeenCalledWith('drivers.company_id', 'company-a');
    expect(mockJoinScope.on).toHaveBeenCalledWith('trucks.id', 'drivers.truck_id');
    expect(mockJoinScope.andOn).toHaveBeenCalledWith('trucks.company_id', 'drivers.company_id');
    expect(mockQuery.select.mock.calls[0]).toEqual(expect.arrayContaining([
      'trucks.unit_number as truck_unit_number',
      'trucks.license_plate as truck_license_plate',
      'trucks.make as truck_make',
    ]));
  });

  it('updates a profile photo key only for the matching company and driver', async () => {
    const repository = new DriverRepository();

    await expect(repository.updateProfilePhotoKey('company-a', 'driver-a', 'company-a/driver-profile/key.png')).resolves.toBe(true);

    expect(mockQuery.where).toHaveBeenCalledWith({ id: 'driver-a', company_id: 'company-a' });
    expect(mockQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      profile_photo_key: 'company-a/driver-profile/key.png',
    }));
  });
});