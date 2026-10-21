import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import TrucksPage from './TrucksPage';
import { trucksApi } from '../../api/trucks';

const { showSuccess, showError } = vi.hoisted(() => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('../../api/trucks', () => ({
  trucksApi: {
    getTrucks: vi.fn(),
    getTruckById: vi.fn(),
    createTruck: vi.fn(),
    updateTruck: vi.fn(),
    deleteTruck: vi.fn(),
  },
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showSuccess, showError }),
}));

describe('TrucksPage list loading', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(trucksApi.getTrucks).mockResolvedValue({ success: true, data: [] } as any);
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

  it('confirms truck creation and refreshes the list with the persisted record', async () => {
    const savedTruck = {
      id: 'truck-uuid',
      unit_number: 'UNIT-42',
      make: 'Freightliner',
      model: 'Cascadia',
      year: 2024,
      vin: null,
      type: 'DRY_VAN',
      status: 'ACTIVE',
    };
    vi.mocked(trucksApi.createTruck).mockResolvedValue({ success: true, data: savedTruck } as any);
    vi.mocked(trucksApi.getTrucks)
      .mockResolvedValueOnce({ success: true, data: [] } as any)
      .mockResolvedValueOnce({ success: true, data: [savedTruck] } as any);

    await act(async () => root.render(<TrucksPage />));
    const addButton = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Add Truck'));
    await act(async () => addButton!.click());

    const inputs = [...container.querySelectorAll('form input')];
    await act(async () => {
      fireEvent.change(inputs[0], { target: { value: 'UNIT-42' } });
      fireEvent.change(inputs[1], { target: { value: 'Freightliner' } });
      fireEvent.change(inputs[2], { target: { value: 'Cascadia' } });
      fireEvent.change(inputs[3], { target: { value: '2024' } });
      fireEvent.change(inputs[4], { target: { value: '' } });
    });
    const form = container.querySelector('form')!;
    await act(async () => fireEvent.submit(form));

    expect(trucksApi.createTruck).toHaveBeenCalledWith(expect.objectContaining({
      unit_number: 'UNIT-42',
      type: 'DRY_VAN',
      status: 'ACTIVE',
    }));
    expect(trucksApi.getTrucks).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('UNIT-42');
    expect(showSuccess).toHaveBeenCalledWith('Truck registered successfully.');
    expect(showError).not.toHaveBeenCalled();
  });
});
