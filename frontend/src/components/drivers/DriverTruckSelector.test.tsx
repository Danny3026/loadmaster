import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { DriverTruckSelector } from './DriverTruckSelector';

describe('DriverTruckSelector', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('displays unit numbers but emits the selected truck UUID', async () => {
    const onChange = vi.fn();
    await act(async () => root.render(
      <DriverTruckSelector
        value=""
        trucks={[{ id: 'truck-uuid', unit_number: 'UNIT-42', status: 'ACTIVE' }]}
        loading={false}
        error=""
        onChange={onChange}
        onRetry={vi.fn()}
      />
    ));

    const select = container.querySelector('select')!;
    const option = select.querySelector('option[value="truck-uuid"]');
    expect(option?.textContent).toBe('UNIT-42 (Available)');
    await act(async () => fireEvent.change(select, { target: { value: 'truck-uuid' } }));
    expect(onChange).toHaveBeenCalledWith('truck-uuid');
  });

  it('keeps driver truck assignment optional', async () => {
    await act(async () => root.render(
      <DriverTruckSelector value="" trucks={[]} loading={false} error="" onChange={vi.fn()} onRetry={vi.fn()} />
    ));

    expect(container.querySelector('option[value=""]')?.textContent).toBe('No truck assigned');
  });
});
