import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettlementService } from './settlement.service';

const { mockSettlementRepository, mockSettlementAdjustmentRepository, mockRecurringDeductionTemplateRepository, mockNotificationService, mockDb } = vi.hoisted(() => {
  const mockSettlementRepository = {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByDriverId: vi.fn(),
    updateStatus: vi.fn(),
    markPaid: vi.fn(),
    create: vi.fn(),
  };

  const mockSettlementAdjustmentRepository = {
    findBySettlement: vi.fn(),
    summarizeBySettlement: vi.fn(),
    create: vi.fn(),
  };

  const mockRecurringDeductionTemplateRepository = {
    findAll: vi.fn(),
    findById: vi.fn(),
    findApplicable: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockNotificationService = {
    notifyAssignedDriver: vi.fn().mockResolvedValue(undefined),
    notifyCompanyRoles: vi.fn().mockResolvedValue(undefined),
  };

  const makeQuery = (result: any, overrides: Record<string, any> = {}) => ({
    where: vi.fn().mockReturnThis(),
    whereIn: vi.fn().mockReturnThis(),
    whereBetween: vi.fn().mockReturnThis(),
    whereRaw: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    join: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(result),
    count: vi.fn().mockResolvedValue([{ count: 0 }]),
    sum: vi.fn().mockReturnThis(),
    then: (resolve: (value: any) => void) => resolve(result),
    ...overrides,
  });

  const deliveredLoads = [
    {
      id: 'load-1',
      load_number: 'LD-1001',
      gross_amount: 2000,
      driver_pay: 1000,
      status: 'DELIVERED',
      delivered_at: '2026-08-02T00:00:00Z',
      driver_first_name: 'John',
      driver_last_name: 'Smith',
      pay_percentage: 50,
    },
    {
      id: 'load-2',
      load_number: 'LD-1002',
      gross_amount: 200,
      driver_pay: 100,
      status: 'DELIVERED',
      delivered_at: '2026-08-04T00:00:00Z',
      driver_first_name: 'John',
      driver_last_name: 'Smith',
      pay_percentage: 50,
    },
  ];

  const mockDb = Object.assign(
    vi.fn((table: string) => {
      if (table === 'drivers') {
        return makeQuery({ id: 'driver-1', first_name: 'John', last_name: 'Smith', pay_percentage: 100 });
      }
      if (table === 'load_assignments as la') {
        return makeQuery(deliveredLoads, {
          where: vi.fn().mockReturnThis(),
          whereIn: vi.fn().mockReturnThis(),
          whereBetween: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          join: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
        });
      }
      if (table === 'settlements') {
        return makeQuery([{ count: 0 }], {
          where: vi.fn().mockReturnThis(),
          count: vi.fn().mockResolvedValue([{ count: 0 }]),
        });
      }
      if (table === 'loads') {
        return makeQuery({ total: '1000' });
      }
      return makeQuery(null);
    }),
    {
      raw: vi.fn(() => 'DATE(loads.updated_at)'),
      transaction: vi.fn(async (callback: (trx: any) => Promise<any>) => callback(mockDb)),
    }
  );

  return { mockSettlementRepository, mockSettlementAdjustmentRepository, mockRecurringDeductionTemplateRepository, mockNotificationService, mockDb };
});

vi.mock('../config/database', () => ({ default: mockDb }));
vi.mock('../repositories/settlement.repository', () => ({
  settlementRepository: mockSettlementRepository,
}));
vi.mock('../repositories/settlement-adjustment.repository', () => ({
  settlementAdjustmentRepository: mockSettlementAdjustmentRepository,
}));
vi.mock('../repositories/recurring-deduction-template.repository', () => ({
  recurringDeductionTemplateRepository: mockRecurringDeductionTemplateRepository,
}));
vi.mock('./notification.service', () => ({
  notificationService: mockNotificationService,
}));

describe('SettlementService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettlementRepository.findAll.mockResolvedValue([]);
    mockSettlementRepository.findById.mockResolvedValue(null);
    mockSettlementAdjustmentRepository.findBySettlement.mockResolvedValue([]);
    mockSettlementAdjustmentRepository.summarizeBySettlement.mockResolvedValue({ earnings: 0, deductions: 0 });
    mockSettlementRepository.create.mockImplementation(async (_companyId: string, payload: any) => ({
      id: 'settlement-1',
      ...payload,
    }));
    mockRecurringDeductionTemplateRepository.findApplicable.mockResolvedValue([]);
  });

  it('creates a settlement payload that matches the schema and preserves driver pay totals', async () => {
    const service = new SettlementService();

    const result = await service.create('company-1', 'user-1', {
      driver_id: 'driver-1',
      period_start: '2026-08-01',
      period_end: '2026-08-07',
      load_ids: ['load-1', 'load-2'],
    });

    expect(mockSettlementRepository.create).toHaveBeenCalledWith(
      'company-1',
      expect.objectContaining({
        driver_id: 'driver-1',
        driver_name: 'John Smith',
        status: 'UNPAID',
        period_start: '2026-08-01',
        period_end: '2026-08-07',
        load_count: 2,
        gross_amount: 2200,
        driver_pay: 1100,
        load_ids: ['load-1', 'load-2'],
      }),
      expect.any(Function)
    );
    expect(mockSettlementRepository.create.mock.calls[0][1]).not.toHaveProperty('settlement_number');
    expect(result.gross_amount).toBe(2200);
    expect(result.driver_pay).toBe(1100);
  });

  it('rejects reconciliation for a driver outside the company before querying assignments', async () => {
    const driverQuery = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
    };
    mockDb.mockReturnValueOnce(driverQuery as any);
    const service = new SettlementService();

    await expect(service.reconcileLoads('company-a', 'driver-company-b', '2026-01-01', '2026-01-31'))
      .rejects.toThrow('Driver not found');

    expect(driverQuery.where).toHaveBeenCalledWith({ id: 'driver-company-b', company_id: 'company-a' });
    expect(mockDb).not.toHaveBeenCalledWith('load_assignments as la');
  });

  it('persists the compensation snapshot and preserves reconciled load gross on settlement reads', async () => {
    const service = new SettlementService();
    const compensationSnapshot = [{
      load_id: 'load-1',
      compensation_type: 'PERCENT_OF_RATE',
      compensation_rate: 25,
    }];
    mockSettlementRepository.findAll.mockResolvedValue([{
      id: 'settlement-1',
      driver_id: 'driver-1',
      driver_name: 'John Smith',
      status: 'UNPAID',
      gross_amount: 2000,
      driver_pay: 500,
      net_amount: 500,
      load_ids: ['load-1'],
      compensation_snapshot: compensationSnapshot,
    }]);
    mockSettlementAdjustmentRepository.summarizeBySettlement.mockResolvedValue({ earnings: 0, deductions: 0 });
    mockSettlementAdjustmentRepository.findBySettlement.mockResolvedValue([]);

    const result = await service.getAll('company-1');

    expect(result[0]).toMatchObject({
      gross_amount: 2000,
      driver_pay: 500,
      base_driver_pay: 500,
      compensation_snapshot: compensationSnapshot,
    });
  });

  it('adds bonuses and reimbursements while subtracting deductions from the final driver payout', async () => {
    const service = new SettlementService();

    const result = await service.create('company-1', 'user-1', {
      driver_id: 'driver-1',
      period_start: '2026-08-01',
      period_end: '2026-08-07',
      load_ids: ['load-1', 'load-2'],
      bonus_amount: 250,
      reimbursements_amount: 50,
      accessorial_amount: 120,
      deductions_amount: 75,
    });

    expect(mockSettlementRepository.create).toHaveBeenCalledWith(
      'company-1',
      expect.objectContaining({
        driver_id: 'driver-1',
        driver_name: 'John Smith',
        gross_amount: 2200,
        driver_pay: 1445,
        bonus_amount: 250,
        reimbursements_amount: 50,
        accessorial_amount: 120,
        deductions_amount: 75,
        net_amount: 1445,
        load_ids: ['load-1', 'load-2'],
      }),
      expect.any(Function)
    );
    expect(result.driver_pay).toBe(1445);
    expect(result.net_amount).toBe(1445);
  });

  it('applies active templates for the company and selected driver, and snapshots their amounts', async () => {
    mockRecurringDeductionTemplateRepository.findApplicable.mockResolvedValue([
      { id: 'template-all', driver_id: null, description: 'Truck Payment', amount: 500, is_active: true },
      { id: 'template-driver', driver_id: 'driver-1', description: 'Insurance', amount: 150, is_active: true },
    ]);
    const service = new SettlementService();

    const result = await service.create('company-1', 'user-1', {
      driver_id: 'driver-1',
      period_start: '2026-08-01',
      period_end: '2026-08-07',
    });

    expect(mockRecurringDeductionTemplateRepository.findApplicable).toHaveBeenCalledWith('company-1', 'driver-1');
    expect(mockSettlementRepository.create).toHaveBeenCalledWith(
      'company-1',
      expect.objectContaining({
        driver_pay: 450,
        net_amount: 450,
        recurring_deductions_snapshot: [
          { template_id: 'template-all', driver_id: null, description: 'Truck Payment', amount: 500 },
          { template_id: 'template-driver', driver_id: 'driver-1', description: 'Insurance', amount: 150 },
        ],
      }),
      expect.any(Function)
    );
    expect(result.recurring_deductions_amount).toBe(650);
    expect(result.deductions_amount).toBe(650);
  }),
  expect.any(Function);

  it('preserves the historical snapshot and calculates the combined bonus and deduction net', async () => {
    mockSettlementRepository.findAll.mockResolvedValue([{
      id: 'settlement-1',
      driver_id: 'driver-1',
      driver_name: 'John Smith',
      status: 'UNPAID',
      gross_amount: 2500,
      driver_pay: 500,
      net_amount: 500,
      load_ids: ['load-1'],
      compensation_snapshot: [{ load_id: 'load-1', compensation_type: 'PERCENT_OF_RATE', compensation_rate: 40 }],
      recurring_deductions_snapshot: [
        { template_id: 'template-truck', driver_id: null, description: 'Truck Payment', amount: 500 },
      ],
    }]);
    mockSettlementAdjustmentRepository.summarizeBySettlement.mockResolvedValue({ earnings: 100, deductions: 50 });
    mockSettlementAdjustmentRepository.findBySettlement.mockResolvedValue([
      { id: 'bonus-1', category: 'EARNING', type: 'BONUS', description: 'Safety Bonus', amount: 100 },
      { id: 'deduction-1', category: 'DEDUCTION', type: 'OTHER', description: 'One-Time Deduction', amount: 50 },
    ]);
    const service = new SettlementService();

    const [settlement] = await service.getAll('company-1');

    expect(settlement).toMatchObject({
      base_driver_pay: 1000,
      driver_pay: 550,
      net_amount: 550,
      deductions_amount: 550,
      recurring_deductions_amount: 500,
      recurring_deductions_snapshot: [
        { template_id: 'template-truck', description: 'Truck Payment', amount: 500 },
      ],
    }),
    expect.any(Function)
    expect(settlement.adjustments).toHaveLength(3);
    expect(settlement.adjustments[2]).toMatchObject({
      type: 'RECURRING_DEDUCTION',
      description: 'Truck Payment',
      amount: 500,
      recurring: true,
    });
  });

  it('does not apply inactive templates returned as inapplicable for a future settlement', async () => {
    mockRecurringDeductionTemplateRepository.findApplicable.mockResolvedValue([]);
    const service = new SettlementService();

    const result = await service.create('company-1', 'user-1', {
      driver_id: 'driver-1',
      period_start: '2026-08-01',
      period_end: '2026-08-07',
    });

    expect(mockSettlementRepository.create).toHaveBeenCalledWith(
      'company-1',
      expect.objectContaining({ driver_pay: 1100, recurring_deductions_snapshot: [] }),
      expect.any(Function)
    );
    expect(result.recurring_deductions_amount).toBe(0);
  });

  it('uses active status toggles only for future settlements', async () => {
    const template = {
      id: 'template-all',
      driver_id: null,
      description: 'Truck Payment',
      amount: 500,
      is_active: true,
    };
    mockRecurringDeductionTemplateRepository.findById.mockResolvedValue(template);
    mockRecurringDeductionTemplateRepository.update.mockImplementation(async (_companyId: string, _id: string, input: any) => ({
      ...template,
      ...input,
    }));
    const service = new SettlementService();

    await service.updateRecurringDeduction('company-1', 'template-all', { is_active: false });
    mockRecurringDeductionTemplateRepository.findApplicable
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([template]);
    const offSettlement = await service.create('company-1', 'user-1', {
      driver_id: 'driver-1',
      period_start: '2026-08-01',
      period_end: '2026-08-07',
    });

    await service.updateRecurringDeduction('company-1', 'template-all', { is_active: true });
    const onSettlement = await service.create('company-1', 'user-1', {
      driver_id: 'driver-1',
      period_start: '2026-08-08',
      period_end: '2026-08-14',
    });

    expect(offSettlement.driver_pay).toBe(1100);
    expect(offSettlement.recurring_deductions_snapshot).toEqual([]);
    expect(onSettlement.driver_pay).toBe(600);
    expect(onSettlement.recurring_deductions_snapshot).toEqual([
      { template_id: 'template-all', driver_id: null, description: 'Truck Payment', amount: 500 },
    ]);
    expect(mockRecurringDeductionTemplateRepository.update).toHaveBeenNthCalledWith(
      1,
      'company-1',
      'template-all',
      { driver_id: null, description: 'Truck Payment', amount: 500, is_active: false }
    );
    expect(mockRecurringDeductionTemplateRepository.update).toHaveBeenNthCalledWith(
      2,
      'company-1',
      'template-all',
      { driver_id: null, description: 'Truck Payment', amount: 500, is_active: true }
    );
  });

  it('rejects a settlement that reuses a load from another active settlement even when the periods differ', async () => {
    mockSettlementRepository.findAll.mockResolvedValue([
      {
        id: 'existing-settlement',
        status: 'UNPAID',
        load_ids: ['load-1'],
        period_start: '2026-08-01',
        period_end: '2026-08-07',
      },
    ]);

    const service = new SettlementService();

    await expect(service.create('company-1', 'user-1', {
      driver_id: 'driver-1',
      period_start: '2026-09-01',
      period_end: '2026-09-07',
      load_ids: ['load-1'],
    })).rejects.toThrow('already included in an active settlement');

    expect(mockSettlementRepository.create).not.toHaveBeenCalled();
  });

  it('allows legacy unpaid settlements to submit, then allows pending settlements to be approved', async () => {
    const service = new SettlementService();
    mockSettlementRepository.findById
      .mockResolvedValueOnce({ id: 'settlement-1', status: 'UNPAID' })
      .mockResolvedValueOnce({ id: 'settlement-1', status: 'PENDING' });
    mockSettlementRepository.updateStatus
      .mockResolvedValueOnce({ id: 'settlement-1', status: 'PENDING' })
      .mockResolvedValueOnce({ id: 'settlement-1', status: 'APPROVED' });

    await expect(service.updateStatus('company-1', 'admin-1', 'settlement-1', 'PENDING')).resolves.toMatchObject({ status: 'PENDING' });
    await expect(service.updateStatus('company-1', 'admin-1', 'settlement-1', 'APPROVED')).resolves.toMatchObject({ status: 'APPROVED' });
    expect(mockSettlementRepository.updateStatus).toHaveBeenNthCalledWith(1, 'company-1', 'settlement-1', expect.objectContaining({ submitted_by: 'admin-1' }), expect.any(Function));
    expect(mockSettlementRepository.updateStatus).toHaveBeenNthCalledWith(2, 'company-1', 'settlement-1', expect.objectContaining({ approved_by: 'admin-1' }), expect.any(Function));
  });

  it('rejects financial adjustments after approval', async () => {
    const service = new SettlementService();
    mockSettlementRepository.findById.mockResolvedValue({ id: 'settlement-1', status: 'APPROVED', driver_id: 'driver-1' });

    await expect(service.addAdjustment('company-1', 'admin-1', 'settlement-1', {
      category: 'EARNING',
      type: 'BONUS',
      description: 'Late bonus',
      amount: 25,
    })).rejects.toThrow('Approved settlements are locked');
    expect(mockSettlementAdjustmentRepository.create).not.toHaveBeenCalled();
  });

  it('marks an approved settlement paid with a persisted payment snapshot', async () => {
    const service = new SettlementService();
    mockSettlementRepository.findById.mockResolvedValue({
      id: 'settlement-1',
      status: 'APPROVED',
      driver_id: 'driver-1',
      gross_amount: 4000,
      driver_pay: 1000,
      load_ids: ['load-1'],
    });
    mockSettlementAdjustmentRepository.summarizeBySettlement.mockResolvedValue({ earnings: 150, deductions: 25 });
    mockSettlementAdjustmentRepository.findBySettlement.mockResolvedValue([]);
    mockSettlementRepository.markPaid.mockImplementation(async (_companyId: string, _id: string, data: any) => ({
      id: 'settlement-1',
      status: 'PAID',
      ...data,
    }));

    const result = await service.markPaid('company-1', 'admin-1', 'settlement-1');

    expect(result.status).toBe('PAID');
    expect(result.payment_date).toBeInstanceOf(Date);
    expect(result.paid_by).toBe('admin-1');
    expect(result.amount_paid).toBe(1125);
    expect(mockSettlementRepository.markPaid).toHaveBeenCalledWith('company-1', 'settlement-1', expect.objectContaining({
      paid_by: 'admin-1',
      amount_paid: 1125,
      net_amount: 1125,
    }), expect.any(Function));
  });

  it('rejects payment unless the settlement is approved and prevents a second payment', async () => {
    const service = new SettlementService();
    mockSettlementRepository.findById.mockResolvedValueOnce({ id: 'settlement-1', status: 'PENDING' });
    await expect(service.markPaid('company-1', 'admin-1', 'settlement-1')).rejects.toThrow('Only approved settlements');

    mockSettlementRepository.findById.mockResolvedValueOnce({ id: 'settlement-1', status: 'PAID' });
    await expect(service.markPaid('company-1', 'admin-1', 'settlement-1')).rejects.toThrow('Only approved settlements');
    expect(mockSettlementRepository.markPaid).not.toHaveBeenCalled();
  });

  it('returns only settlements owned by the authenticated driver', async () => {
    const service = new SettlementService();
    mockSettlementRepository.findByDriverId.mockResolvedValue([
      { id: 'settlement-1', driver_id: 'driver-1', status: 'PAID', amount_paid: 500, load_ids: [] },
    ]);
    mockSettlementAdjustmentRepository.summarizeBySettlement.mockResolvedValue({ earnings: 0, deductions: 0 });
    mockSettlementAdjustmentRepository.findBySettlement.mockResolvedValue([]);

    const result = await service.getForDriver('company-1', 'driver-1');

    expect(mockSettlementRepository.findByDriverId).toHaveBeenCalledWith('company-1', 'driver-1', undefined);
    expect(result).toHaveLength(1);
    expect(result[0].driver_id).toBe('driver-1');
  });

  it('rejects a driver settlement detail request for another driver', async () => {
    const service = new SettlementService();
    mockSettlementRepository.findByDriverId.mockResolvedValue([]);

    await expect(service.getForDriver('company-1', 'driver-1', 'settlement-owned-by-driver-2'))
      .rejects.toThrow('Settlement not found');
    expect(mockSettlementRepository.findByDriverId).toHaveBeenCalledWith('company-1', 'driver-1', 'settlement-owned-by-driver-2');
  });
});
