import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompanyService } from './company.service';
import db from '../config/database';

const originalTaxEncryptionKey = process.env.PAYER_TAX_ENCRYPTION_KEY;

vi.mock('../config/database', () => ({
  default: vi.fn(),
}));

describe('CompanyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYER_TAX_ENCRYPTION_KEY = 'unit-test-company-tax-key';
  });

  afterEach(() => {
    if (originalTaxEncryptionKey === undefined) {
      delete process.env.PAYER_TAX_ENCRYPTION_KEY;
    } else {
      process.env.PAYER_TAX_ENCRYPTION_KEY = originalTaxEncryptionKey;
    }
  });

  it('treats a labeled test identifier as missing legacy EIN data', async () => {
    const service = new CompanyService();
    const query: any = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({
        id: 'company-1',
        name: 'Danny Transport',
        brand_color: '#1a5fb4',
        tin: 'TEST-ONLY-NOT-A-REAL-EIN',
        dispatch_notification_template: 'New Dispatch from {{company_name}}',
      }),
      update: vi.fn().mockResolvedValue(1),
    };

    vi.mocked(db as any).mockReturnValue(query);

    const company = await service.getForCompany('company-1');

    expect(company).toMatchObject({
      id: 'company-1',
      name: 'Danny Transport',
      brandColor: '#1a5fb4',
      tinConfigured: false,
      tinMasked: null,
      dispatchNotificationTemplate: expect.stringContaining('{{company_name}}'),
    });
    expect(company).not.toHaveProperty('tin');
    expect(query.update).not.toHaveBeenCalled();
  });

  it('rejects malformed or masked EIN values instead of storing them', async () => {
    const service = new CompanyService();
    const query: any = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ id: 'company-1' }),
      update: vi.fn(),
    };
    vi.mocked(db as any).mockReturnValue(query);

    await expect(service.updateCompany('company-1', { tin: 'TEST-ONLY-NOT-A-REAL-EIN' }))
      .rejects.toThrow('EIN must contain nine digits');
    await expect(service.updateCompany('company-1', { tin: '••-•••6789' }))
      .rejects.toThrow('EIN must contain nine digits');
    expect(query.update).not.toHaveBeenCalled();
  });

  it('does not treat a nonnumeric legacy marker as a configured EIN', async () => {
    const service = new CompanyService();
    const query: any = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ id: 'company-1', tin: 'TEST-ONLY-NOT-A-REAL-EIN' }),
      update: vi.fn(),
    };
    vi.mocked(db as any).mockReturnValue(query);

    const company = await service.getForCompany('company-1');

    expect(company).toMatchObject({ tinConfigured: false, tinMasked: null });
    expect(company).not.toHaveProperty('tin');
    expect(query.update).not.toHaveBeenCalled();
  });

  it('preserves missing EIN state when unrelated company details are updated', async () => {
    const service = new CompanyService();
    const stored = {
      id: 'company-1',
      name: 'Example Carrier LLC',
      tin_encrypted: null,
      tin: null,
      city: 'Dallas',
    };
    const query: any = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockImplementation(async () => stored),
      update: vi.fn().mockImplementation(async (changes) => {
        Object.assign(stored, changes);
        return 1;
      }),
    };
    vi.mocked(db as any).mockReturnValue(query);

    const company = await service.updateCompany('company-1', { city: 'Houston' });

    expect(query.update).toHaveBeenCalledWith({ city: 'Houston' });
    expect(company).toMatchObject({ tinConfigured: false, tinMasked: null });
  });

  it('does not store a development test identifier as a payer EIN', async () => {
    const service = new CompanyService();
    const stored = { id: 'company-1', name: 'Example Carrier LLC', tin: null, tin_encrypted: null };
    const query: any = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockImplementation(async () => stored),
      update: vi.fn().mockImplementation(async (changes) => {
        Object.assign(stored, changes);
        return 1;
      }),
    };
    vi.mocked(db as any).mockReturnValue(query);

    await expect(service.updateCompany('company-1', { tin: 'TEST-ONLY-NOT-A-REAL-EIN' }))
      .rejects.toThrow('EIN must contain nine digits');
    expect(query.update).not.toHaveBeenCalled();
    expect(stored.tin_encrypted).toBeNull();
  });

  it('can cryptographically round-trip a labeled test marker without accepting it as an EIN', async () => {
    const service = new CompanyService();
    const testMarker = 'TEST-ONLY-NOT-A-REAL-EIN';
    const encryptedMarker = (service as any).encryptEin(testMarker);
    const query: any = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ id: 'company-1', tin_encrypted: encryptedMarker }),
    };
    vi.mocked(db as any).mockReturnValue(query);

    expect((service as any).decryptEin(encryptedMarker)).toBe(testMarker);
    await expect(service.getPayerEin('company-1')).resolves.toBeNull();
    expect(query.where).toHaveBeenCalledWith({ id: 'company-1' });
  });

  it('persists and returns the company-specific dispatch notification template', async () => {
    const service = new CompanyService();
    const stored = {
      id: 'company-a',
      name: 'Company A',
      tin_encrypted: null,
      tin: null,
      dispatch_notification_template: 'Old {{load_number}}',
    };
    const query: any = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockImplementation(async () => stored),
      update: vi.fn().mockImplementation(async (changes) => {
        Object.assign(stored, changes);
        return 1;
      }),
    };
    vi.mocked(db as any).mockReturnValue(query);

    const company = await service.updateCompany('company-a', {
      dispatch_notification_template: 'Welcome {{driver_name}} to {{load_number}}',
    });

    expect(query.update).toHaveBeenCalledWith({
      dispatch_notification_template: 'Welcome {{driver_name}} to {{load_number}}',
    });
    expect(company.dispatchNotificationTemplate).toBe('Welcome {{driver_name}} to {{load_number}}');
  });

  it('rejects unsupported dispatch placeholders before updating the company', async () => {
    const service = new CompanyService();
    const query: any = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ id: 'company-a', tin_encrypted: null, tin: null }),
      update: vi.fn(),
    };
    vi.mocked(db as any).mockReturnValue(query);

    await expect(service.updateCompany('company-a', {
      dispatch_notification_template: 'Rate {{rate}} account {{other_company}}',
    })).rejects.toThrow('Unsupported dispatch template placeholder(s): other_company.');
    expect(query.update).not.toHaveBeenCalled();
  });
});
