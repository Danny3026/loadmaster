import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvoiceService } from './invoice.service';
import { invoiceRepository } from '../repositories/invoice.repository';
import { loadRepository } from '../repositories/load.repository';
import { loadAssignmentRepository } from '../repositories/load-assignment.repository';
import { brokerRepository } from '../repositories/broker.repository';
import { driverRepository } from '../repositories/driver.repository';
import db from '../config/database';
import { companyService } from './company.service';
import { env } from '../config/env';

vi.mock('../repositories/invoice.repository', () => ({
  invoiceRepository: {
    generateInvoiceNumber: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../repositories/load.repository', () => ({
  loadRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../repositories/load-assignment.repository', () => ({
  loadAssignmentRepository: {
    findActiveByLoad: vi.fn().mockResolvedValue(null),
    findHistoryByLoad: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../repositories/broker.repository', () => ({
  brokerRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../repositories/driver.repository', () => ({
  driverRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../config/database', () => ({
  default: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

vi.mock('./company.service', () => ({
  companyService: {
    getForCompany: vi.fn(),
    getPayerEin: vi.fn(),
  },
}));

vi.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    ENABLE_1099_TEST_FIXTURE: true,
  },
}));

describe('InvoiceService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows manual broker invoice creation using the values entered by the user', async () => {
    const service = new InvoiceService();

    vi.mocked(invoiceRepository.generateInvoiceNumber).mockResolvedValue('INV-2026-0001');
    vi.mocked(loadRepository.findById).mockResolvedValue({
      id: 'load-1',
      broker_id: null,
      rate: 2500,
    } as any);
    vi.mocked(invoiceRepository.create).mockResolvedValue({
      id: 'invoice-1',
      invoice_number: 'INV-2026-0001',
      load_id: 'load-1',
      broker_name: 'ABC Logistics',
      broker_mc_number: 'MC-123456',
      load_number: 'LD-10025',
      commodity: 'Refrigerated',
      rate: 2500,
      extras: 150,
      total_amount: 2650,
      pickup_location: 'Dallas, TX',
      delivery_location: 'Atlanta, GA',
      status: 'PENDING',
      payment_status: 'UNPAID',
    } as any);

    const result = await service.create('company-1', {
      load_id: 'load-1',
      invoice_number: 'INV-2026-0001',
      broker_name: 'ABC Logistics',
      broker_mc_number: 'MC-123456',
      load_number: 'LD-10025',
      commodity: 'Refrigerated',
      pickup_location: 'Dallas, TX',
      delivery_location: 'Atlanta, GA',
      rate: '2500',
      accessorials: [{ description: 'Fuel surcharge', amount: 150 }],
      invoice_date: '2026-08-14',
      notes: 'Fuel surcharge',
    });

    expect(loadRepository.findById).toHaveBeenCalledWith('company-1', 'load-1');
    expect(brokerRepository.findById).not.toHaveBeenCalled();
    expect(invoiceRepository.create).toHaveBeenCalledWith(
      'company-1',
      expect.objectContaining({
        load_id: 'load-1',
        invoice_number: 'INV-2026-0001',
        rate: 2500,
        extras: 150,
        total_amount: 2650,
        status: 'PENDING',
        payment_status: 'UNPAID',
      })
    );
    expect(result.total_amount).toBe(2650);
  });

  it('uses the active load assignment when creating an invoice without an explicit driver', async () => {
    const service = new InvoiceService();
    vi.mocked(loadRepository.findById).mockResolvedValue({
      id: 'load-1',
      broker_id: null,
      rate: 2500,
    } as any);
    vi.mocked(loadAssignmentRepository.findActiveByLoad).mockResolvedValue({
      driver_id: 'driver-1',
    } as any);
    vi.mocked(driverRepository.findById).mockResolvedValue({ id: 'driver-1' } as any);
    vi.mocked(invoiceRepository.create).mockResolvedValue({ id: 'invoice-1' } as any);

    await service.create('company-1', {
      load_id: 'load-1',
      invoice_number: 'INV-1',
      broker_name: 'ABC Logistics',
      rate: 2500,
    });

    expect(loadAssignmentRepository.findActiveByLoad).toHaveBeenCalledWith('load-1', 'company-1');
    expect(driverRepository.findById).toHaveBeenCalledWith('company-1', 'driver-1');
    expect(invoiceRepository.create).toHaveBeenCalledWith(
      'company-1',
      expect.objectContaining({ driver_id: 'driver-1' })
    );
  });

  it('rejects an invoice driver that is outside the load company', async () => {
    const service = new InvoiceService();
    vi.mocked(loadRepository.findById).mockResolvedValue({
      id: 'load-1',
      broker_id: null,
      rate: 2500,
    } as any);
    vi.mocked(loadAssignmentRepository.findActiveByLoad).mockResolvedValue(null);
    vi.mocked(loadAssignmentRepository.findHistoryByLoad).mockResolvedValue([]);
    vi.mocked(driverRepository.findById).mockResolvedValue(null);

    await expect(service.create('company-a', {
      load_id: 'load-1',
      driver_id: 'company-b-driver',
      invoice_number: 'INV-FOREIGN-DRIVER',
      broker_name: 'Broker A',
      rate: 2500,
    })).rejects.toThrow('Driver not found');

    expect(driverRepository.findById).toHaveBeenCalledWith('company-a', 'company-b-driver');
    expect(invoiceRepository.create).not.toHaveBeenCalled();
  });
});

describe('LoadService.getAll', () => {
  it('includes the company name when listing loads for a tenant', async () => {
    const service = new (await import('./load.service')).LoadService();
    const query = {
      select: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      whereExists: vi.fn().mockReturnThis(),
      whereRaw: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      clone: vi.fn().mockReturnThis(),
      clearSelect: vi.fn().mockReturnThis(),
      count: vi.fn().mockResolvedValue([{ count: '2' }]),
    };

    const dbMock = vi.mocked((await import('../config/database')).default as any);
    dbMock.mockReturnValue(query as any);
    dbMock.raw = vi.fn((value: string) => value);

    const result = await service.getAll('company-1', {}, { limit: 20, offset: 0 });

    expect(result.total).toBe(2);
    expect(query.select.mock.calls.flat().join(' ')).toContain('companies.name as company_name');
    expect(query.leftJoin).toHaveBeenCalledWith('companies', 'loads.company_id', 'companies.id');
  });

  it('rejects a broker owned by another company when creating a load', async () => {
    const { LoadService } = await import('./load.service');
    const service = new LoadService();
    const loadQuery: any = {
      where: vi.fn().mockReturnThis(),
      count: vi.fn().mockResolvedValue([{ count: '0' }]),
      first: vi.fn().mockResolvedValue(null),
    };
    const brokerQuery: any = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
    };
    const dbMock = vi.mocked((await import('../config/database')).default as any);
    dbMock.mockImplementation((table: string) => {
      if (table === 'loads') return loadQuery;
      if (table === 'brokers') return brokerQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    await expect(service.create('company-a', 'owner-a', {
      load_number: 'LOAD-A-1',
      broker_id: 'broker-company-b',
      rate: 1000,
      stops: [],
    })).rejects.toThrow('Broker not found');

    expect(brokerQuery.where).toHaveBeenCalledWith({ id: 'broker-company-b', company_id: 'company-a' });
  });

  it('hides status history from a driver without a current assignment', async () => {
    const { LoadService } = await import('./load.service');
    const service = new LoadService();
    vi.mocked(loadRepository.findById).mockResolvedValue({ id: 'load-a' } as any);
    const assignmentQuery = {
      join: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
    };
    const dbMock = vi.mocked((await import('../config/database')).default as any);
    dbMock.mockImplementation((table: string) => {
      if (table === 'load_assignments as la') return assignmentQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    await expect(service.getStatusHistory('company-a', 'load-a', 'driver-user-a'))
      .rejects.toThrow('Load not found');
    expect(assignmentQuery.where).toHaveBeenCalledWith({
      'la.load_id': 'load-a',
      'la.is_active': true,
      'd.user_id': 'driver-user-a',
      'd.company_id': 'company-a',
    });
  });
});

describe('InvoiceService invoice status dates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists the explicitly confirmed invoice sent date', async () => {
    const service = new InvoiceService();
    vi.mocked(invoiceRepository.findById).mockResolvedValue({ status: 'PENDING' } as any);
    const update = vi.spyOn(service, 'update').mockResolvedValue({ status: 'SENT' } as any);

    await service.markAsSent('company-1', 'invoice-1', '2026-09-30');

    expect(update).toHaveBeenCalledWith('company-1', 'invoice-1', {
      status: 'SENT',
      invoice_sent_date: '2026-09-30',
    });
  });

  it('persists the explicitly confirmed payment received date', async () => {
    const service = new InvoiceService();
    vi.mocked(invoiceRepository.findById).mockResolvedValue({ status: 'SENT' } as any);
    const update = vi.spyOn(service, 'update').mockResolvedValue({ status: 'PAID' } as any);

    await service.markAsPaid('company-1', 'invoice-1', '2026-10-01');

    expect(update).toHaveBeenCalledWith('company-1', 'invoice-1', {
      status: 'PAID',
      payment_status: 'PAID',
      payment_received_date: '2026-10-01',
    });
  });

  it('rejects invalid dates before updating invoice status', async () => {
    const service = new InvoiceService();
    vi.mocked(invoiceRepository.findById).mockResolvedValue({ status: 'PENDING' } as any);
    const update = vi.spyOn(service, 'update');

    await expect(service.markAsSent('company-1', 'invoice-1', '2026-02-30'))
      .rejects.toThrow('Invalid invoice sent date');
    expect(update).not.toHaveBeenCalled();
  });
});

describe('InvoiceService.getTaxSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('InvoiceService.validateTaxPreparation', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    const validCompany = {
      name: 'Example Logistics LLC',
      addressLine1: '1 Main Street',
      city: 'Dallas',
      state: 'TX',
      zipCode: '75001',
    };

    it('blocks preparation and identifies missing contractor TIN without creating a document', async () => {
      const service = new InvoiceService();
      vi.mocked(companyService.getForCompany).mockResolvedValue(validCompany as any);
      vi.mocked(companyService.getPayerEin).mockResolvedValue('CONFIGURED-TEST-ONLY');

      const query: any = {
        select: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        whereNotIn: vi.fn().mockReturnThis(),
        whereRaw: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          driver_id: 'driver-1',
          driver_name: 'Daniel Gift',
          tin: 'TEST-ONLY-NOT-A-REAL-TIN',
          mailing_address: '123 Main St',
          mailing_city: 'Dallas',
          mailing_state: 'TX',
          mailing_zip: '75001',
          paid_settlement_count: '3',
          total_paid: '4031.59',
        }),
      };
      vi.mocked(db as any).mockReturnValue(query);

      const result = await service.validateTaxPreparation('company-1', 'driver-1', {
        taxYear: '2026',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });

      expect(result.ready).toBe(false);
      expect(result.status).toBe('MISSING_TAX_INFORMATION');
      expect(result.missing).toContain('Contractor TIN');
    });

    it('allows preparation only when payer, contractor, and paid earnings data are complete', async () => {
      const service = new InvoiceService();
      vi.mocked(companyService.getForCompany).mockResolvedValue(validCompany as any);
      vi.mocked(companyService.getPayerEin).mockResolvedValue('CONFIGURED-TEST-ONLY');

      const query: any = {
        select: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        whereNotIn: vi.fn().mockReturnThis(),
        whereRaw: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          driver_id: 'driver-1',
          driver_name: 'Daniel Gift',
          tin: 'CONFIGURED-TEST-ONLY',
          mailing_address: '123 Main St',
          mailing_city: 'Dallas',
          mailing_state: 'TX',
          mailing_zip: '75001',
          paid_settlement_count: '3',
          total_paid: '4031.59',
        }),
      };
      vi.mocked(db as any).mockReturnValue(query);

      const result = await service.validateTaxPreparation('company-1', 'driver-1', {
        taxYear: '2026',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });

      expect(result).toMatchObject({
        ready: true,
        status: 'READY_TO_PREPARE',
        driver: { totalPaid: 4031.59, paidSettlementCount: 3 },
        payer: { tin: 'CONFIGURED-TEST-ONLY' },
      });
    });

    it('returns the explicit dev-only fixture with no persisted records or real-looking identifiers', () => {
      const service = new InvoiceService();
      const fixture = service.getDevelopmentTaxFixture(2026);

      expect(fixture).toMatchObject({
        ready: true,
        status: 'READY_TO_PREPARE',
        testOnly: true,
        driver: {
          driverName: 'Daniely Gift',
          tin: 'TEST-ONLY-NOT-A-REAL-TIN',
          mailingAddress: '1200 Market Street',
          mailingCity: 'Dallas',
          mailingState: 'TX',
          mailingZip: '75201',
          paidSettlementCount: 3,
          totalPaid: 4031.59,
        },
        payer: {
          name: 'Danny Logistics LLC',
          tin: 'TEST-ONLY-NOT-A-REAL-EIN',
        },
        taxYear: 2026,
      });
      expect(db).not.toHaveBeenCalled();
      expect(companyService.getForCompany).not.toHaveBeenCalled();
      expect(companyService.getPayerEin).not.toHaveBeenCalled();
    });

    it('rejects fixture requests for years other than 2026', () => {
      const service = new InvoiceService();
      expect(() => service.getDevelopmentTaxFixture(2025))
        .toThrow('The development test fixture is available for tax year 2026 only.');
    });

    it('does not expose the fixture when production mode is active', () => {
      const service = new InvoiceService();
      const previousMode = env.NODE_ENV;
      (env as any).NODE_ENV = 'production';
      try {
        expect(() => service.getDevelopmentTaxFixture(2026))
          .toThrow('Development tax fixture is not available');
      } finally {
        (env as any).NODE_ENV = previousMode;
      }
    });

    it('does not expose the fixture when its feature flag is disabled', () => {
      const service = new InvoiceService();
      const previousFlag = env.ENABLE_1099_TEST_FIXTURE;
      (env as any).ENABLE_1099_TEST_FIXTURE = false;
      try {
        expect(() => service.getDevelopmentTaxFixture(2026))
          .toThrow('Development tax fixture is not available');
      } finally {
        (env as any).ENABLE_1099_TEST_FIXTURE = previousFlag;
      }
    });
  });

  it('returns the mailing address joined from the same driver as the tax totals', async () => {
    const service = new InvoiceService();
    const rows = [{
      driver_id: 'driver-1',
      driver_name: 'John Smith',
      mailing_address: '123 Main St',
      mailing_city: 'Dallas',
      mailing_state: 'TX',
      mailing_zip: '75001',
      paid_settlement_count: '2',
      total_paid: '1500.00',
    }];
    const joinCondition = {
      on: vi.fn().mockReturnThis(),
      andOn: vi.fn().mockReturnThis(),
    };
    const query: any = {
      select: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockImplementation((_table, condition) => {
        if (typeof condition === 'function') condition.call(joinCondition);
        return query;
      }),
      where: vi.fn().mockReturnThis(),
      whereNotNull: vi.fn().mockReturnThis(),
      whereNotIn: vi.fn().mockReturnThis(),
      whereRaw: vi.fn().mockReturnThis(),
      whereNot: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      orderByRaw: vi.fn().mockResolvedValue(rows),
    };
    vi.mocked(db as any).mockReturnValue(query);

    const result = await service.getTaxSummary('company-1', {
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      include: 'PAID',
    });

    expect(query.leftJoin).toHaveBeenCalledWith('drivers', expect.any(Function));
    expect(joinCondition.on).toHaveBeenCalledWith('invoices.driver_id', 'drivers.id');
    expect(joinCondition.andOn).toHaveBeenCalledWith('invoices.company_id', 'drivers.company_id');
    expect(result.rows[0]).toEqual(expect.objectContaining({
      driverId: 'driver-1',
      mailingAddress: '123 Main St',
      mailingCity: 'Dallas',
      mailingState: 'TX',
      mailingZip: '75001',
    }));
  });

  it('groups paid invoice totals by driver and excludes unpaid records in the selected date range', async () => {
    const service = new InvoiceService();

    const mockProvider = vi.spyOn((service as any), 'getTaxSummary').mockResolvedValue({
      summary: {
        driverCount: 2,
        total: 3500,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      },
      rows: [
        { driverId: 'driver-1', driverName: 'John Smith', tin: 'XXX-XX-1234', paidSettlementCount: 2, totalPaid: 1500 },
        { driverId: 'driver-2', driverName: 'Michael Brown', tin: 'XXX-XX-5678', paidSettlementCount: 1, totalPaid: 2000 },
      ],
    } as any);

    const result = await service.getTaxSummary('company-1', {
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      include: 'PAID',
    });

    expect(mockProvider).toHaveBeenCalledWith('company-1', {
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      include: 'PAID',
    });
    expect(result.summary.total).toBe(3500);
    expect(result.rows).toHaveLength(2);
  });
});
