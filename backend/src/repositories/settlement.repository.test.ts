import { afterEach, describe, expect, it, vi } from 'vitest';
import knexFactory, { Knex } from 'knex';
import { SettlementRepository } from './settlement.repository';

vi.mock('../config/database', () => ({ default: vi.fn() }));

const pgUtils = require('pg/lib/utils') as {
  prepareValue(value: unknown): unknown;
};

const snapshotCases = [
  {
    name: 'non-empty compensation snapshots',
    snapshot: [
      {
        load_id: 'synthetic-load',
        compensation_type: 'PERCENT_OF_RATE',
        compensation_rate: 40,
      },
    ],
  },
  {
    name: 'empty compensation snapshots',
    snapshot: [],
  },
  {
    name: 'nullable compensation snapshots',
    snapshot: null,
  },
];

describe('SettlementRepository.create JSON bindings', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each(snapshotCases)('binds $name as valid JSONB input', async ({ snapshot }) => {
    const knex = knexFactory({ client: 'pg' });
    const capturedQueries: Array<{ sql: string; bindings: unknown[] }> = [];
    const client = knex.client as any;
    const originalRunner = client.runner;

    client.runner = (builder: Knex.QueryBuilder) => ({
      run: async () => {
        const query = builder.toSQL();
        capturedQueries.push({ sql: query.sql, bindings: query.bindings });
        return [{
          gross_amount: '100.00',
          driver_pay: '60.00',
          bonus_amount: '0.00',
          reimbursements_amount: '0.00',
          accessorial_amount: '0.00',
          deductions_amount: '0.00',
          net_amount: '60.00',
          load_ids: ['synthetic-load'],
        }];
      },
    });

    try {
      const repository = new SettlementRepository();
      await repository.create('synthetic-company', {
        driver_id: 'synthetic-driver',
        driver_name: 'Synthetic Driver',
        period_start: '2026-01-01',
        period_end: '2026-01-07',
        load_count: 1,
        gross_amount: 100,
        driver_pay: 60,
        load_ids: ['synthetic-load'],
        compensation_snapshot: snapshot,
        recurring_deductions_snapshot: [],
      }, knex);

      expect(capturedQueries).toHaveLength(1);
      const query = capturedQueries[0];
      const columnList = query.sql.match(/insert into "settlements" \(([^)]+)\) values/)?.[1];
      expect(columnList).toBeDefined();
      const columns = columnList!.split(', ').map((column) => column.replace(/"/g, ''));
      const snapshotIndex = columns.indexOf('compensation_snapshot');
      expect(snapshotIndex).toBeGreaterThanOrEqual(0);

      const preparedValue = pgUtils.prepareValue(query.bindings[snapshotIndex]);
      if (snapshot === null) {
        expect(preparedValue).toBeNull();
      } else {
        expect(typeof preparedValue).toBe('string');
        expect(JSON.parse(preparedValue as string)).toEqual(snapshot);
      }
    } finally {
      client.runner = originalRunner;
      await knex.destroy();
    }
  });
});
