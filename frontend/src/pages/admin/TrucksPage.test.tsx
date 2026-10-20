import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TrucksPage from './TrucksPage';
import { trucksApi } from '../../api/trucks';

vi.mock('../../api/trucks', () => ({
  trucksApi: {
    getTrucks: vi.fn(),
    getTruckById: vi.fn(),
    createTruck: vi.fn(),
    updateTruck: vi.fn(),
    deleteTruck: vi.fn(),
  },
}));

describe('TrucksPage list loading', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('shows a retryable error instead of an empty-fleet message when loading fails', async () => {
    vi.mocked(trucksApi.getTrucks).mockRejectedValueOnce({
      response: { data: { error: { message: 'Unable to reach the truck service.' } } },
    });

    await act(async () => root.render(<TrucksPage />));

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Unable to reach the truck service.');
    expect(container.textContent).toContain('Truck list could not be loaded.');
    expect(container.textContent).not.toContain('Start building your fleet');
  });

  it('retries the company-scoped truck list and displays the returned truck', async () => {
    vi.mocked(trucksApi.getTrucks)
      .mockRejectedValueOnce(new Error('Temporary request failure'))
      .mockResolvedValueOnce({
        success: true,
        data: [{
          id: 'truck-uuid',
          unit_number: 'UNIT-42',
          make: 'Freightliner',
          model: 'Cascadia',
          year: 2024,
          vin: 'SYNTHETIC-VIN',
          status: 'ACTIVE',
        }],
      } as any);

    await act(async () => root.render(<TrucksPage />));

    const retry = [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Retry');
    expect(retry).toBeDefined();
    await act(async () => retry!.click());

    expect(trucksApi.getTrucks).toHaveBeenCalledTimes(2);
    expect(trucksApi.getTrucks).toHaveBeenLastCalledWith({ limit: 100, offset: 0 });
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain('UNIT-42');
    expect(container.textContent).not.toContain('No trucks found');
  });
});
