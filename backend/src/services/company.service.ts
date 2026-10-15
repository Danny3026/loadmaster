import db from '../config/database';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { ValidationError } from '../utils/errors';
import {
  DEFAULT_DISPATCH_NOTIFICATION_TEMPLATE,
  validateDispatchNotificationTemplate,
} from './dispatch-notification-template';

export class CompanyService {
  private defaultCompanyValues() {
    return {
      name: 'Danny Transport',
      mc_number: 'MC-12345',
      dot_number: '123456',
      address_line1: '123 Main st',
      city: 'Dallas',
      state: 'TX',
      zip_code: '75201',
      phone: '',
      email: 'dispatch@dannytransport.com',
      tin: null,
      tin_encrypted: null,
      brand_color: '#1a5fb4',
      logo_url: null,
      dispatch_notification_template: DEFAULT_DISPATCH_NOTIFICATION_TEMPLATE,
    };
  }

  private normalizeEin(value: string): string {
    const trimmed = value.trim();
    if (!this.isUsableEin(trimmed)) {
      throw new ValidationError('EIN must contain nine digits in the format XX-XXXXXXX.');
    }
    const digits = trimmed.replace('-', '');
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }

  private isValidEin(value: string): boolean {
    return /^\d{2}-?\d{7}$/.test(value.trim());
  }

  private isUsableEin(value: string): boolean {
    const normalized = value.trim().replace(/\D/g, '');
    const repeatedDigit = /^(\d)\1{8}$/.test(normalized);
    const ascendingSequence = normalized.length === 9
      && [...normalized].every((digit, index) => Number(digit) === (Number(normalized[0]) + index) % 10);
    return this.isValidEin(value) && !repeatedDigit && !ascendingSequence;
  }

  private encryptionKey(source: 'payer' | 'jwt'): Buffer {
    const secret = source === 'payer'
      ? process.env.PAYER_TAX_ENCRYPTION_KEY
      : process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('Payer tax encryption is not configured.');
    }
    return createHash('sha256').update(`loadmaster:payer-tax:${source}:v1:`).update(secret).digest();
  }

  private encryptEin(value: string): string {
    const iv = randomBytes(12);
    const source = process.env.PAYER_TAX_ENCRYPTION_KEY ? 'payer' : 'jwt';
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(source), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `v1:${source}:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
  }

  private decryptEin(value: string): string {
    const [version, source, encodedIv, encodedTag, encodedValue] = value.split(':');
    if (version !== 'v1' || (source !== 'payer' && source !== 'jwt') || !encodedIv || !encodedTag || !encodedValue) {
      throw new Error('Stored payer tax identifier has an unsupported encrypted format.');
    }
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(source), Buffer.from(encodedIv, 'base64'));
    decipher.setAuthTag(Buffer.from(encodedTag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(encodedValue, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  private async resolveEin(company: any): Promise<string | null> {
    if (company.tin_encrypted) {
      const decrypted = this.decryptEin(company.tin_encrypted);
      return this.isUsableEin(decrypted) ? this.normalizeEin(decrypted) : null;
    }

    const legacyTin = typeof company.tin === 'string' ? company.tin.trim() : '';
    if (!legacyTin || !this.isUsableEin(legacyTin)) return null;

    const normalized = this.normalizeEin(legacyTin);
    await db('companies')
      .where({ id: company.id, tin_encrypted: null })
      .update({ tin_encrypted: this.encryptEin(normalized), tin: null });
    return normalized;
  }

  private async formatCompany(company: any) {
    const ein = await this.resolveEin(company);
    return {
      id: company.id,
      name: company.name || 'Danny Transport',
      mcNumber: company.mc_number || null,
      dotNumber: company.dot_number || null,
      addressLine1: company.address_line1 || null,
      addressLine2: company.address_line2 || null,
      city: company.city || null,
      state: company.state || null,
      zipCode: company.zip_code || null,
      phone: company.phone || null,
      email: company.email || null,
      tinConfigured: Boolean(ein),
      tinMasked: ein ? `••-•••${ein.replace(/\D/g, '').slice(-4)}` : null,
      logoUrl: company.logo_url || null,
      brandColor: company.brand_color || '#1a5fb4',
      status: company.status || 'ACTIVE',
      dispatchNotificationTemplate: company.dispatch_notification_template || DEFAULT_DISPATCH_NOTIFICATION_TEMPLATE,
      createdAt: company.created_at,
      updatedAt: company.updated_at,
    };
  }

  async getForCompany(companyId?: string) {
    if (!companyId) {
      return this.formatCompany({
        ...this.defaultCompanyValues(),
        id: 'default-company',
      });
    }

    const company = await db('companies').where({ id: companyId }).first();

    if (!company) {
      const insertion = {
        id: companyId,
        ...this.defaultCompanyValues(),
      };

      const [created] = await db('companies').insert(insertion).returning('*');
      return this.formatCompany(created || insertion);
    }

    return this.formatCompany({
      ...this.defaultCompanyValues(),
      ...company,
    });
  }

  async getPayerEin(companyId: string): Promise<string | null> {
    const company = await db('companies').where({ id: companyId }).first();
    if (!company) return null;
    return this.resolveEin(company);
  }

  async updateCompany(companyId: string, payload: Record<string, any>) {
    const existing = await db('companies').where({ id: companyId }).first();

    const updateData: Record<string, any> = {};
    const allowed = [
      'name',
      'mc_number',
      'dot_number',
      'address_line1',
      'address_line2',
      'city',
      'state',
      'zip_code',
      'phone',
      'email',
      'logo_url',
      'brand_color',
      'dispatch_notification_template',
    ];

    for (const key of allowed) {
      if (payload[key] !== undefined) {
        updateData[key] = key === 'dispatch_notification_template'
          ? validateDispatchNotificationTemplate(payload[key])
          : payload[key];
      }
    }

    if (payload.tin !== undefined) {
      if (payload.tin === null || payload.tin === '') {
        updateData.tin = null;
        updateData.tin_encrypted = null;
      } else if (typeof payload.tin === 'string') {
        const ein = this.normalizeEin(payload.tin);
        updateData.tin = null;
        updateData.tin_encrypted = this.encryptEin(ein);
      } else {
        throw new ValidationError('EIN must be entered as nine digits.');
      }
    }

    if (updateData.name === '') {
      updateData.name = 'Danny Transport';
    }

    if (!existing) {
      const base = {
        id: companyId,
        ...this.defaultCompanyValues(),
      };
      await db('companies').insert({ ...base, ...updateData });
      return this.getForCompany(companyId);
    }

    if (Object.keys(updateData).length > 0) {
      await db('companies').where({ id: companyId }).update(updateData);
    }

    return this.getForCompany(companyId);
  }
}

export const companyService = new CompanyService();
