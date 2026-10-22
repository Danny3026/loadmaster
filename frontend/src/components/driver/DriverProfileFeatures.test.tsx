import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { driversApi } from '../../api/drivers';
import { ToastProvider } from '../../contexts/ToastContext';
import { AssignedTruckCard } from './AssignedTruckCard';
import { DriverAvatar } from './DriverAvatar';
import { DriverProfilePhoto } from './DriverProfilePhoto';

describe('driver profile features', () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;
  let originalCreateObjectUrl: PropertyDescriptor | undefined;
  let originalRevokeObjectUrl: PropertyDescriptor | undefined;

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    originalCreateObjectUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    originalRevokeObjectUrl = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:driver-preview') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    queryClient.clear();
    container.remove();
    if (originalCreateObjectUrl) Object.defineProperty(URL, 'createObjectURL', originalCreateObjectUrl);
    else Reflect.deleteProperty(URL, 'createObjectURL');
    if (originalRevokeObjectUrl) Object.defineProperty(URL, 'revokeObjectURL', originalRevokeObjectUrl);
    else Reflect.deleteProperty(URL, 'revokeObjectURL');
    vi.restoreAllMocks();
  });

  const renderWithProviders = (content: React.ReactNode) => root.render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{content}</ToastProvider>
    </QueryClientProvider>,
  );

  it('shows the authenticated driver truck details and a clear unassigned state', async () => {
    await act(async () => renderWithProviders(
      <>
        <AssignedTruckCard
          driver={{
            id: 'driver-a',
            assigned_truck_id: 'truck-a',
            truck_unit_number: '42',
            truck_license_plate: 'ABC123',
            truck_license_state: 'TX',
            truck_make: 'Freightliner',
            truck_model: 'Cascadia',
            truck_year: 2022,
            truck_type: 'DRY_VAN',
            truck_status: 'ACTIVE',
          }}
        />
        <AssignedTruckCard driver={{ id: 'driver-b' }} />
      </>,
    ));

    expect(container.textContent).toContain('Unit 42 · 2022 Freightliner Cascadia');
    expect(container.textContent).toContain('Registration: ABC123 (TX)');
    expect(container.textContent).toContain('No truck currently assigned.');
  });

  it('shows initials instead of a missing or broken photo when no photo is saved', async () => {
    await act(async () => renderWithProviders(
      <DriverAvatar driver={{ id: 'driver-a', first_name: 'Alex', last_name: 'Rivera', has_profile_photo: false }} className="h-12 w-12" />,
    ));

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[role="img"]')?.textContent).toBe('AR');
  });

  it('previews and uploads a supported profile photo with success feedback', async () => {
    const upload = vi.spyOn(driversApi, 'uploadMyProfilePhoto').mockResolvedValue({ has_profile_photo: true });
    await act(async () => renderWithProviders(
      <DriverProfilePhoto driver={{ id: 'driver-a', first_name: 'Alex', last_name: 'Rivera' }} />,
    ));
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'profile.png', { type: 'image/png' });

    await act(async () => {
      Object.defineProperty(input, 'files', { configurable: true, value: [file] });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.querySelector('img[alt="Selected profile photo preview"]')?.getAttribute('src')).toBe('blob:driver-preview');
    const saveButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Save photo'));
    expect(saveButton).toBeTruthy();
    await act(async () => {
      saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(upload).toHaveBeenCalledWith(file, expect.any(Function));
    expect(container.textContent).toContain('Profile photo updated.');
  });

  it('rejects an unsupported client-side file type', async () => {
    await act(async () => renderWithProviders(
      <DriverProfilePhoto driver={{ id: 'driver-a' }} />,
    ));
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['not an image'], 'profile.txt', { type: 'text/plain' });

    await act(async () => {
      Object.defineProperty(input, 'files', { configurable: true, value: [file] });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('Choose a JPEG, PNG, or WebP image.');
    expect(container.querySelector('button')).toBeNull();
  });

  it('rejects a client-side image larger than five megabytes', async () => {
    await act(async () => renderWithProviders(
      <DriverProfilePhoto driver={{ id: 'driver-a' }} />,
    ));
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'profile.png', { type: 'image/png' });

    await act(async () => {
      Object.defineProperty(input, 'files', { configurable: true, value: [file] });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('Profile photos must be 5 MB or smaller.');
    expect(container.querySelector('button')).toBeNull();
  });
});
