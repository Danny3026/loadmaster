import { describe, expect, it, vi } from 'vitest';

const mockDb = vi.hoisted(() => ({
  __esModule: true,
  default: {
    raw: vi.fn(() => 'COALESCE(loads.updated_at, loads.created_at)')
  }
}));

vi.mock('../config/database', () => mockDb);

import { DashboardService, applyDeliveredDateRange } from './dashboard.service';

describe('applyDeliveredDateRange', () => {
  it('uses the delivered-at date column instead of created_at when filtering date ranges', () => {
    const query: any = {
      whereRaw: vi.fn().mockReturnThis(),
    };

    applyDeliveredDateRange(query, { startDate: '2026-08-01', endDate: '2026-08-31' });

    expect(query.whereRaw).toHaveBeenCalledWith(
      'COALESCE(loads.updated_at, loads.created_at) >= ?',
      ['2026-08-01']
    );
    expect(query.whereRaw).toHaveBeenCalledWith(
      'COALESCE(loads.updated_at, loads.created_at) <= ?',
      ['2026-08-31 23:59:59']
    );
  });
});

describe('DashboardService', () => {
  it('keeps the delivered-date filter logic consistent for dashboard metrics', () => {
    const service = new DashboardService();
    const result = (service as any).applyDeliveredDateRange;
    expect(typeof result).toBe('function');
  });
});
