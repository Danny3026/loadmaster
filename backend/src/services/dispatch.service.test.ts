import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DispatchService } from './dispatch.service';

const { state, mockDb, mockNotifyAssignedDriver } = vi.hoisted(() => {
  const state: any = {
    load: {
      id: 'load-a', company_id: 'company-a', load_number: 'LD-A-1', status: 'pending',
      broker_id: 'broker-a', loaded_miles: 420, rate: 9000, commodity: 'Lumber',
    },
    driver: { id: 'driver-a', company_id: 'company-a', first_name: 'Driver', last_name: 'A', status: 'ACTIVE' },
    previousAssignment: null as any,
    activeAssignment: { assignment_id: 'assignment-existing', driver_id: 'driver-a', user_id: 'driver-user-a', first_name: 'Driver', last_name: 'A' } as any,
    existingDispatchNotification: null as any,
    stopDateBounds: { start_date: null as Date | string | null, end_date: null as Date | string | null },
    availabilityDateFilters: [] as any[],
    truckResult: { id: 'truck-a', unit_number: 'T-1' } as any,
    truckFilters: [] as any[],
    truckUnassignedFilterCount: 0,
    stops: [
      { stop_type: 'PICKUP', facility_name: 'Origin', city: 'Dallas', state: 'TX', appointment_date: '2026-10-20', appointment_start: '08:30:00' },
      { stop_type: 'DELIVERY', facility_name: 'Destination', city: 'Austin', state: 'TX', appointment_date: '2026-10-21', appointment_start: '14:00:00' },
    ],
  };
  const mockNotifyAssignedDriver = vi.fn().mockResolvedValue(undefined);

  const makeBuilder = (table: string, transactional: boolean): any => {
    const builder: any = {
      join: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      where: vi.fn((...args: any[]) => {
        if (table === 'driver_availability' && typeof args[0] === 'string') {
          state.availabilityDateFilters.push(args);
        }
        if (table === 'trucks') state.truckFilters.push(args);
        return builder;
      }),
      andWhere: vi.fn().mockReturnThis(),
      whereNot: vi.fn().mockReturnThis(),
      whereNotNull: vi.fn().mockReturnThis(),
      whereNotExists: vi.fn(() => {
        if (table === 'trucks') state.truckUnassignedFilterCount += 1;
        return builder;
      }),
      orderBy: vi.fn().mockReturnThis(),
      min: vi.fn().mockReturnThis(),
      max: vi.fn().mockReturnThis(),
      forUpdate: vi.fn().mockReturnThis(),
      first: vi.fn().mockImplementation(async () => {
        if (table === 'loads') return state.load;
        if (table === 'load_assignments as la') return state.previousAssignment;
        if (table === 'load_assignments as assignments') return state.activeAssignment;
        if (table === 'drivers') return state.driver;
        if (table === 'trucks') return state.truckResult;
        if (table === 'companies') return { name: 'Company A', dispatch_notification_template: 'Company {{company_name}}: {{load_number}} for {{driver_name}} from {{pickup_location}} {{pickup_date}} to {{delivery_location}} {{delivery_date}}; {{miles}} mi {{commodity}} {{rate}}' };
        if (table === 'brokers') return { name: 'Broker A' };
        if (table === 'notifications') return state.existingDispatchNotification;
        if (table === 'users') return { role: 'ADMIN' };
        if (table === 'load_stops') return state.stopDateBounds;
        return null;
      }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockResolvedValue(1),
      returning: vi.fn().mockImplementation(async () => [{ id: 'assignment-new' }]),
      then: (resolve: (value: any) => unknown) => Promise.resolve(table === 'load_stops' ? state.stops : []).then(resolve),
    };
    if (table === 'load_assignments') {
      builder.first.mockResolvedValue(null);
      builder.returning.mockResolvedValue([{ id: 'assignment-new' }]);
    }
    if (!transactional && table === 'users') builder.first.mockResolvedValue({ role: 'ADMIN' });
    return builder;
  };

  const mockTrx: any = (table: string) => makeBuilder(table, true);
  mockTrx.fn = { now: vi.fn(() => 'now') };
  const mockDb: any = Object.assign(
    vi.fn((table: string) => makeBuilder(table, false)),
    { transaction: vi.fn(async (callback: (trx: any) => unknown) => callback(mockTrx)) }
  );

  return { state, mockDb, mockNotifyAssignedDriver };
});

vi.mock('../config/database', () => ({ default: mockDb }));
vi.mock('./notification.service', () => ({
  notificationService: {
    notifyAssignedDriver: mockNotifyAssignedDriver,
    notifyCompanyRoles: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('DispatchService template notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.load = {
      id: 'load-a', company_id: 'company-a', load_number: 'LD-A-1', status: 'pending',
      broker_id: 'broker-a', loaded_miles: 420, rate: 9000, commodity: 'Lumber',
    };
    state.driver = { id: 'driver-a', company_id: 'company-a', first_name: 'Driver', last_name: 'A', status: 'ACTIVE' };
    state.previousAssignment = null;
    state.activeAssignment = { assignment_id: 'assignment-existing', driver_id: 'driver-a', user_id: 'driver-user-a', first_name: 'Driver', last_name: 'A' };
    state.existingDispatchNotification = null;
    state.stopDateBounds = { start_date: null, end_date: null };
    state.availabilityDateFilters = [];
    state.truckResult = { id: 'truck-a', unit_number: 'T-1' };
    state.truckFilters = [];
    state.truckUnassignedFilterCount = 0;
    state.stops = [
      { stop_type: 'PICKUP', facility_name: 'Origin', city: 'Dallas', state: 'TX', appointment_date: '2026-10-20', appointment_start: '08:30:00' },
      { stop_type: 'DELIVERY', facility_name: 'Destination', city: 'Austin', state: 'TX', appointment_date: '2026-10-21', appointment_start: '14:00:00' },
    ];
  });

  it('uses persisted company/load/driver data and omits financial rate fields', async () => {
    const service = new DispatchService();

    const result = await service.assignLoad('company-a', 'load-a', 'driver-a', 'truck-a', 'admin-a', true);

    expect(result.newStatus).toBe('dispatched');
    expect(mockNotifyAssignedDriver).toHaveBeenCalledTimes(1);
    expect(mockNotifyAssignedDriver).toHaveBeenCalledWith('company-a', 'driver-a', expect.objectContaining({
      type: 'LOAD_DISPATCHED',
      title: 'Load LD-A-1 dispatched',
      message: 'Company Company A: LD-A-1 for Driver A from Origin, Dallas, TX 10/20/2026 08:30 to Destination, Austin, TX 10/21/2026 14:00; 420 mi Lumber ',
      loadId: 'load-a',
      relatedEntityType: 'LOAD_ASSIGNMENT',
      relatedEntityId: 'assignment-new',
    }), expect.anything());
  });

  it('does not notify when the dispatch request fails validation', async () => {
    state.load.status = 'in_transit';
    const service = new DispatchService();

    await expect(service.assignLoad('company-a', 'load-a', 'driver-a', 'truck-a', 'admin-a', true))
      .rejects.toThrow('Load is already in transit');

    expect(mockNotifyAssignedDriver).not.toHaveBeenCalled();
  });

  it('selects only an active truck for the current company that is not already assigned', async () => {
    const service = new DispatchService();

    await service.assignLoad('company-a', 'load-a', 'driver-a', undefined, 'admin-a', true);

    expect(state.truckFilters).toContainEqual([{ company_id: 'company-a', status: 'ACTIVE' }]);
    expect(state.truckUnassignedFilterCount).toBe(1);
  });

  it('reports missing eligible trucks instead of assigning a different truck', async () => {
    state.truckResult = null;
    const service = new DispatchService();

    await expect(service.assignLoad('company-a', 'load-a', 'driver-a', undefined, 'admin-a', true))
      .rejects.toMatchObject({
        message: 'No available truck is currently eligible for this company',
        statusCode: 404,
        code: 'NOT_FOUND',
      });

    expect(state.truckFilters).toContainEqual([{ company_id: 'company-a', status: 'ACTIVE' }]);
    expect(state.truckUnassignedFilterCount).toBe(1);
    expect(mockNotifyAssignedDriver).not.toHaveBeenCalled();
  });

  it('passes ISO dates to availability queries when PostgreSQL returns Date objects', async () => {
    state.stopDateBounds = {
      start_date: new Date(2026, 7, 13),
      end_date: new Date(2026, 7, 14),
    };
    state.stops = [
      { stop_type: 'PICKUP', facility_name: 'Origin', city: 'Dallas', state: 'TX', appointment_date: new Date(2026, 9, 20), appointment_start: '08:30:00' },
      { stop_type: 'DELIVERY', facility_name: 'Destination', city: 'Austin', state: 'TX', appointment_date: new Date(2026, 9, 21), appointment_start: '14:00:00' },
    ];
    expect(String(state.stopDateBounds.start_date).slice(0, 10)).toBe('Thu Aug 13');

    const service = new DispatchService();
    await service.assignLoad('company-a', 'load-a', 'driver-a', 'truck-a', 'admin-a', true);

    expect(state.availabilityDateFilters).toContainEqual(['start_date', '<=', '2026-08-14']);
    expect(state.availabilityDateFilters).toContainEqual(['end_date', '>=', '2026-08-13']);
    expect(mockNotifyAssignedDriver).toHaveBeenCalledWith('company-a', 'driver-a', expect.objectContaining({
      message: expect.stringContaining('10/20/2026 08:30 to Destination, Austin, TX 10/21/2026 14:00'),
    }), expect.anything());
  });

  it('preserves ISO date strings in availability queries', async () => {
    state.stopDateBounds = { start_date: '2026-10-20', end_date: '2026-10-21' };

    const service = new DispatchService();
    await service.assignLoad('company-a', 'load-a', 'driver-a', 'truck-a', 'admin-a', true);

    expect(state.availabilityDateFilters).toContainEqual(['start_date', '<=', '2026-10-21']);
    expect(state.availabilityDateFilters).toContainEqual(['end_date', '>=', '2026-10-20']);
  });

  it('notifies the new driver with the template and the previous driver about reassignment', async () => {
    state.previousAssignment = { driver_id: 'driver-old' };
    const service = new DispatchService();

    await service.assignLoad('company-a', 'load-a', 'driver-a', 'truck-a', 'admin-a', true);

    expect(mockNotifyAssignedDriver).toHaveBeenCalledTimes(2);
    expect(mockNotifyAssignedDriver).toHaveBeenNthCalledWith(1, 'company-a', 'driver-a', expect.objectContaining({ type: 'LOAD_DISPATCHED' }), expect.anything());
    expect(mockNotifyAssignedDriver).toHaveBeenNthCalledWith(2, 'company-a', 'driver-old', expect.objectContaining({
      type: 'LOAD_ASSIGNMENT_CHANGED',
      message: 'You are no longer assigned to load LD-A-1.',
    }), expect.anything());
  });

  it('does not create a second dispatch notification for the same assignment retry', async () => {
    state.existingDispatchNotification = { id: 'notification-existing' };
    const service = new DispatchService();

    await service.assignLoad('company-a', 'load-a', 'driver-a', 'truck-a', 'admin-a', true);

    expect(mockNotifyAssignedDriver).not.toHaveBeenCalled();
  });

  it('sends the saved template when an assigned pending load transitions to dispatched', async () => {
    const service = new DispatchService();

    const result = await service.updateLoadStatus('company-a', 'load-a', 'dispatched', 'admin-a');

    expect(result.newStatus).toBe('dispatched');
    expect(mockNotifyAssignedDriver).toHaveBeenCalledTimes(1);
    expect(mockNotifyAssignedDriver).toHaveBeenCalledWith('company-a', 'driver-a', expect.objectContaining({
      type: 'LOAD_DISPATCHED',
      relatedEntityId: 'assignment-existing',
    }), expect.anything());
  });

  it('sends the template to a newly assigned driver when a dispatched load is reassigned', async () => {
    state.load.status = 'dispatched';
    state.previousAssignment = { driver_id: 'driver-old' };
    const service = new DispatchService();

    const result = await service.assignLoad('company-a', 'load-a', 'driver-a', 'truck-a', 'admin-a', false, false, true);

    expect(result.newStatus).toBe('dispatched');
    expect(mockNotifyAssignedDriver).toHaveBeenCalledWith('company-a', 'driver-a', expect.objectContaining({
      type: 'LOAD_DISPATCHED',
    }), expect.anything());
    expect(mockNotifyAssignedDriver).toHaveBeenCalledWith('company-a', 'driver-old', expect.objectContaining({
      type: 'LOAD_ASSIGNMENT_CHANGED',
    }), expect.anything());
  });
});