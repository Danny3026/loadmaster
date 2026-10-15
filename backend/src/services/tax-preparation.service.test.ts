import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import db from '../config/database';
import { invoiceService } from './invoice.service';
import { TaxPreparationService } from './tax-preparation.service';

const originalTaxKey = process.env.PAYER_TAX_ENCRYPTION_KEY;
const records: any[] = [];

vi.mock('../config/database', () => ({
  default: Object.assign(vi.fn(), {
    transaction: vi.fn(),
  }),
}));

vi.mock('./invoice.service', () => ({
  invoiceService: {
    getDevelopmentTaxFixture: vi.fn(),
    validateTaxPreparation: vi.fn(),
  },
}));

vi.mock('../config/env', () => ({
  env: { NODE_ENV: 'test', ENABLE_1099_TEST_FIXTURE: true },
}));

const createQuery = (table: string) => {
  let filters: Record<string, unknown> = {};
  let isMax = false;
  let pendingInsert: any;

  const matches = (row: any) => Object.entries(filters).every(([key, value]) => row[key] === value);
  const builder: any = {
    where(values: Record<string, unknown>) {
      filters = { ...filters, ...values };
      return builder;
    },
    select() {
      return builder;
    },
    orderBy() {
      return builder;
    },
    max() {
      isMax = true;
      return builder;
    },
    first() {
      const rows = records.filter(matches);
      if (isMax) {
        const latest = rows.reduce((value, row) => Math.max(value, Number(row.version)), 0);
        return Promise.resolve({ latest_version: latest || null });
      }
      return Promise.resolve(rows[0] || null);
    },
    insert(value: any) {
      pendingInsert = value;
      return builder;
    },
    async returning() {
      const record = {
        ...pendingInsert,
        id: `prepared-${records.length + 1}`,
        created_at: new Date('2026-09-27T00:00:00.000Z').toISOString(),
      };
      records.push(record);
      return [{
        id: record.id,
        tax_year: record.tax_year,
        version: record.version,
        status: record.status,
        created_at: record.created_at,
      }];
    },
    then(resolve: (value: any) => unknown, reject: (reason: unknown) => unknown) {
      const rows = records.filter(matches);
      return Promise.resolve(rows).then(resolve, reject);
    },
  };
  return builder;
};

const fixtureForAddress = (mailingAddress = '1200 Market Street') => ({
  ready: true,
  status: 'READY_TO_PREPARE',
  testOnly: true,
  missing: [],
  driver: {
    driverId: 'development-test-fixture',
    driverName: 'Daniely Gift',
    tin: 'TEST-ONLY-NOT-A-REAL-TIN',
    mailingAddress,
    mailingCity: 'Dallas',
    mailingState: 'TX',
    mailingZip: '75201',
    paidSettlementCount: 3,
    totalPaid: 4031.59,
  },
  payer: {
    name: 'Danny Logistics LLC',
    addressLine1: '1200 Market Street',
    city: 'Dallas',
    state: 'TX',
    zipCode: '75201',
    tin: 'TEST-ONLY-NOT-A-REAL-EIN',
  },
  taxYear: 2026,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
});

const expectedFixtureSnapshot = (mailingAddress = '1200 Market Street') => ({
  testOnly: true,
  taxYear: 2026,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  payer: fixtureForAddress(mailingAddress).payer,
  contractor: fixtureForAddress(mailingAddress).driver,
  qualifyingPaidEarnings: 4031.59,
  paidSettlementCount: 3,
});

describe('TaxPreparationService development fixture snapshots', () => {
  beforeEach(() => {
    records.splice(0, records.length);
    process.env.PAYER_TAX_ENCRYPTION_KEY = 'test-tax-preparation-encryption-key';
    vi.clearAllMocks();
    (db as any).mockImplementation((table: string) => createQuery(table));
    (db as any).transaction.mockImplementation((callback: (trx: any) => unknown) => callback(
      Object.assign((table: string) => createQuery(table), {
        raw: vi.fn().mockResolvedValue(undefined),
      })
    ));
    vi.mocked(invoiceService.getDevelopmentTaxFixture).mockImplementation(
      (_taxYear: number, mailingAddress?: string) => fixtureForAddress(mailingAddress)
    );
  });

  afterEach(() => {
    if (originalTaxKey === undefined) delete process.env.PAYER_TAX_ENCRYPTION_KEY;
    else process.env.PAYER_TAX_ENCRYPTION_KEY = originalTaxKey;
  });

  it('persists encrypted historical snapshots and keeps old addresses when creating a new version', async () => {
    const service = new TaxPreparationService();
    const pdfBase64 = Buffer.from('%PDF-1.7\ntest', 'ascii').toString('base64');
    const original = await service.create('company-test', {
      taxYear: 2026,
      testOnly: true,
      testMailingAddress: '1200 Market Street',
      expectedSnapshot: expectedFixtureSnapshot('1200 Market Street'),
      pdfBase64,
    });

    expect(original).toMatchObject({
      id: 'prepared-1',
      version: 1,
      status: 'PREPARED',
      testOnly: true,
      qualifyingPaidEarnings: 4031.59,
      paidSettlementCount: 3,
    });
    const originalSnapshot = (service as any).decrypt(records[0].encrypted_data);
    expect(originalSnapshot).toMatchObject({
      testOnly: true,
      taxYear: 2026,
      payer: { name: 'Danny Logistics LLC', addressLine1: '1200 Market Street' },
      contractor: { driverName: 'Daniely Gift', mailingAddress: '1200 Market Street' },
      qualifyingPaidEarnings: 4031.59,
      paidSettlementCount: 3,
    });
    expect(records[0].encrypted_data).not.toContain('TEST-ONLY-NOT-A-REAL');
    expect(records[0].encrypted_data).not.toContain('1200 Market Street');

    const regenerated = await service.create('company-test', {
      taxYear: 2026,
      testOnly: true,
      testMailingAddress: '500 Oak Street',
      expectedSnapshot: expectedFixtureSnapshot('500 Oak Street'),
      pdfBase64,
    });
    const savedRecords = await service.list('company-test', 2026);

    expect(regenerated).toMatchObject({ id: 'prepared-2', version: 2 });
    expect(savedRecords).toHaveLength(2);
    const versions = Object.fromEntries(savedRecords.map((record: any) => [record.version, record]));
    expect(Object.keys(versions)).toEqual(['1', '2']);
    expect(versions[1].mailingAddress).toBe('1200 Market Street');
    expect(versions[2].mailingAddress).toBe('500 Oak Street');
    expect(versions[1].qualifyingPaidEarnings).toBe(4031.59);
    expect(versions[1].paidSettlementCount).toBe(3);
    expect((service as any).decrypt(records[0].encrypted_data).contractor.mailingAddress)
      .toBe('1200 Market Street');
    expect((service as any).decrypt(records[1].encrypted_data).contractor.mailingAddress)
      .toBe('500 Oak Street');

    const downloaded = await service.getPdf('company-test', original.id);
    expect(downloaded.pdf).toEqual(Buffer.from('%PDF-1.7\ntest', 'ascii'));
    expect(downloaded.filename).toBe('1099-NEC-TEST-Daniely-Gift-2026-v1.pdf');
    expect(downloaded.filename).not.toContain('TEST-ONLY');
  });

  it('does not persist a snapshot when no generated PDF is provided', async () => {
    const service = new TaxPreparationService();
    await expect(service.create('company-test', {
      taxYear: 2026,
      testOnly: true,
      expectedSnapshot: expectedFixtureSnapshot(),
      pdfBase64: '',
    })).rejects.toThrow('A generated preparation PDF is required.');
    expect(records).toHaveLength(0);
  });

  it('blocks creation and writes no prepared record when real-data validation finds missing fields', async () => {
    vi.mocked(invoiceService.validateTaxPreparation).mockResolvedValue({
      ready: false,
      status: 'MISSING_TAX_INFORMATION',
      missing: ['Contractor TIN'],
    } as any);
    const service = new TaxPreparationService();

    await expect(service.create('company-test', {
      driverId: 'driver-test',
      taxYear: 2026,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      expectedSnapshot: {},
      pdfBase64: Buffer.from('%PDF-1.7', 'ascii').toString('base64'),
    })).rejects.toMatchObject({
      message: '1099-NEC cannot be prepared yet.',
      details: { missing: ['Contractor TIN'] },
    });
    expect(records).toHaveLength(0);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('rejects changed tax data if the generated PDF was based on an older validation snapshot', async () => {
    const service = new TaxPreparationService();
    const staleSnapshot = expectedFixtureSnapshot('1200 Market Street');

    await expect(service.create('company-test', {
      taxYear: 2026,
      testOnly: true,
      testMailingAddress: '500 Oak Street',
      expectedSnapshot: staleSnapshot,
      pdfBase64: Buffer.from('%PDF-1.7\ntest', 'ascii').toString('base64'),
    })).rejects.toThrow('Tax information changed after validation.');
    expect(records).toHaveLength(0);
  });
});
