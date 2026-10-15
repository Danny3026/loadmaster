import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TaxesPage from './TaxesPage';
import { invoicesApi } from '../../api/invoices';

const taxState = vi.hoisted(() => ({
  rows: [] as any[],
  preparations: [] as any[],
  summary: { driverCount: 0, total: 0, startDate: '2026-01-01', endDate: '2026-12-31' },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: any) => ({
    data: options.queryKey[0] === 'taxPreparations'
      ? taxState.preparations
      : { rows: taxState.rows, summary: taxState.summary },
    isLoading: false,
    error: null,
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('../../hooks/useCompany', () => ({
  useCompany: () => ({
    data: { name: 'Danny Logistics LLC', tinConfigured: false, tinMasked: null },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../api/invoices', () => ({
  invoicesApi: {
    getTaxSummary: vi.fn(),
    validateTaxPreparation: vi.fn(),
    getDevelopmentTaxFixture: vi.fn(),
    createTaxPreparation: vi.fn(),
    getTaxPreparations: vi.fn(),
    downloadTaxPreparation: vi.fn(),
  },
}));

describe('TaxesPage real-data workflow', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    taxState.rows = [];
    taxState.preparations = [];
    taxState.summary = { driverCount: 0, total: 0, startDate: '2026-01-01', endDate: '2026-12-31' };
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('shows the normal missing-payer and empty-settlement state without development fixture UI', async () => {
    await act(async () => root.render(<MemoryRouter><TaxesPage /></MemoryRouter>));

    expect(container.textContent).toContain('Payer EIN/TIN missing');
    expect(container.textContent).toContain('No settlements found in this date range.');
    expect(container.textContent).toContain('$0.00');
    expect(container.textContent).not.toContain('Development-only 1099 test data');
    expect(container.textContent).not.toContain('Load test data');
    expect(container.textContent).not.toContain('TEST DATA — NOT REAL TAX IDENTIFIERS');
    expect(invoicesApi.getDevelopmentTaxFixture).not.toHaveBeenCalled();
  });

  it('blocks real preparation when required tax identifiers are missing', async () => {
    taxState.rows = [{
      driverId: 'driver-with-missing-tin',
      driverName: 'Existing Driver',
      mailingAddress: '',
      mailingCity: '',
      mailingState: '',
      mailingZip: '',
      paidSettlementCount: 0,
      totalPaid: 0,
    }];
    taxState.summary = { driverCount: 1, total: 0, startDate: '2026-01-01', endDate: '2026-12-31' };
    vi.mocked(invoicesApi.validateTaxPreparation).mockResolvedValue({
      ready: false,
      missing: ['Payer EIN/TIN', 'Contractor TIN'],
    } as any);

    await act(async () => root.render(<MemoryRouter><TaxesPage /></MemoryRouter>));
    const generateButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Generate 1099-NEC'));
    expect(generateButton).toBeDefined();
    await act(async () => generateButton!.click());

    expect(invoicesApi.validateTaxPreparation).toHaveBeenCalledWith('driver-with-missing-tin', {
      taxYear: 2025,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    });
    expect(container.textContent).toContain('Missing: Payer EIN/TIN, Contractor TIN.');
    expect(invoicesApi.createTaxPreparation).not.toHaveBeenCalled();
  });
});
