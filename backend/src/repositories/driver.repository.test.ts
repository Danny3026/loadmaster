import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DriverRepository } from './driver.repository';

const { mockDb, mockQuery, mockScope } = vi.hoisted(() => {
  const mockScope = {
    where: vi.fn().mockReturnThis(),
    orWhereNull: vi.fn().mockReturnThis(),
  };
  const mockQuery: any = {
    leftJoin: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation((condition: any) => {
      if (typeof condition === 'function') condition.call(mockScope);
      return mockQuery;
    }),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue({ id: 'driver-a', company_id: 'company-a' }),
    then: (resolve: (value: any[]) => unknown) => Promise.resolve([]).then(resolve),
  };
  const mockDb: any = vi.fn(() => mockQuery);
  mockDb.raw = vi.fn(() => 'availability_status');
  return { mockDb, mockQuery, mockScope };
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
});