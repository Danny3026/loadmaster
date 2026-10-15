import { beforeEach, describe, expect, it, vi } from 'vitest';
import db from '../config/database';
import { DriverAvailabilityService } from './driver-availability.service';

vi.mock('../config/database', () => ({
  default: vi.fn(),
}));

const queryFor = (rows: any[]) => {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    join: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn(function (this: any, predicate: any) {
      if (typeof predicate === 'function') predicate.call(this);
      return this;
    }),
    orWhereNull: vi.fn().mockReturnThis(),
    whereIn: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    then: (resolve: (value: any[]) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  };
  return builder;
};

describe('DriverAvailabilityService.getTimeline', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports On Duty for an active assigned load even when appointment dates are outside the visible timeline', async () => {
    const drivers = [{
      id: 'driver-1',
      first_name: 'Alpha',
      last_name: 'Mapepele',
      status: 'ACTIVE',
    }];
    const assignmentRows = [{
      driver_id: 'driver-1',
      load_id: 'load-1',
      load_number: 'LOAD-1',
      appointment_date: '2026-09-18',
    }];
    vi.mocked(db as any).mockImplementation((table: string) => {
      if (table === 'drivers') return queryFor(drivers);
      if (table === 'driver_availability') return queryFor([]);
      if (table === 'load_assignments as la') return queryFor(assignmentRows);
      throw new Error(`Unexpected table ${table}`);
    });

    const result = await new DriverAvailabilityService().getTimeline(
      'company-1',
      '2026-09-30',
      '2026-10-13'
    );

    expect(result.drivers).toEqual([expect.objectContaining({
      id: 'driver-1',
      status: 'ASSIGNED',
    })]);
    expect(result.assignments).toEqual([]);
  });
});
