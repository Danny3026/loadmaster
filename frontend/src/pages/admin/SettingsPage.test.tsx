import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from './SettingsPage';

const { state, mutateAsync, showError, showSuccess } = vi.hoisted(() => ({
  state: {
    company: {
      id: 'company-a',
      name: 'Company A Transport',
      brandColor: '#b45309',
      dispatchNotificationTemplate: 'For {{driver_name}}: load {{load_number}} from {{pickup_location}}. Rate {{rate}}',
    } as any,
  },
  mutateAsync: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('@/hooks/useCompany', () => ({
  useCompany: () => ({ data: state.company, isLoading: false }),
  useUpdateCompany: () => ({ mutateAsync, isPending: false }),
  useUploadCompanyLogo: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/useLoads', () => ({
  useLoads: () => ({ data: { data: [{
    load_number: 'LOAD-A-1',
    driver_first_name: 'Driver',
    driver_last_name: 'A',
    loaded_miles: 120,
    broker_name: 'Broker A',
    commodity: 'Lumber',
    stops: [
      { stop_type: 'PICKUP', facility_name: 'Origin', city: 'Dallas', state: 'TX', appointment_date: '2026-10-20' },
      { stop_type: 'DELIVERY', facility_name: 'Destination', city: 'Austin', state: 'TX', appointment_date: '2026-10-21' },
    ],
  }] } }),
}));
vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showError, showSuccess }),
}));

describe('SettingsPage dispatch template editor', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    state.company = {
      id: 'company-a',
      name: 'Company A Transport',
      brandColor: '#b45309',
      dispatchNotificationTemplate: 'For {{driver_name}}: load {{load_number}} from {{pickup_location}}. Rate {{rate}}',
    };
    mutateAsync.mockImplementation(async (payload: any) => ({
      ...state.company,
      dispatchNotificationTemplate: payload.dispatch_notification_template ?? state.company.dispatchNotificationTemplate,
    }));
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    (globalThis as any).requestAnimationFrame = (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('previews the edited template with current company/load/driver data and saves it', async () => {
    await act(async () => root.render(<SettingsPage />));

    const settings = container.querySelector('.max-w-4xl') as HTMLDivElement;
    expect(settings.style.getPropertyValue('--company-brand-color')).toBe('#b45309');
    expect([...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Save Changes'))?.className).toContain('brand-primary-bg');
    expect([...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Save Template'))?.className).toContain('brand-primary-bg');

    expect(container.textContent).toContain('For Driver A: load LOAD-A-1 from Origin, Dallas, TX. Rate');
    expect(container.textContent).not.toContain('Rate $');

    const textarea = container.querySelector('#dispatch-template') as HTMLTextAreaElement;
    await act(async () => {
      textarea.setSelectionRange(0, 0);
      [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'commodity')?.click();
    });
    expect(textarea.value.startsWith('{{commodity}}')).toBe(true);

    await act(async () => {
      [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Save Template'))?.click();
      await Promise.resolve();
    });
    expect(mutateAsync).toHaveBeenCalledWith({ dispatch_notification_template: '{{commodity}}For {{driver_name}}: load {{load_number}} from {{pickup_location}}. Rate {{rate}}' });
  });

  it('confirms before discarding a dirty template and persists the default', async () => {
    await act(async () => root.render(<SettingsPage />));
    const textarea = container.querySelector('#dispatch-template') as HTMLTextAreaElement;
    await act(async () => {
      textarea.setSelectionRange(0, 0);
      [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'commodity')?.click();
    });
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    await act(async () => {
      [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Reset to default'))?.click();
    });
    expect(mutateAsync).not.toHaveBeenCalled();

    vi.mocked(window.confirm).mockReturnValue(true);
    await act(async () => {
      [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Reset to default'))?.click();
      await Promise.resolve();
    });
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      dispatch_notification_template: expect.stringContaining('New Dispatch from {{company_name}}'),
    }));
  });
});