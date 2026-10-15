import { createCipheriv, createDecipheriv, createHash, randomBytes, } from 'crypto';
import db from '../config/database';
import { env } from '../config/env';
import { NotFoundError, ValidationError } from '../utils/errors';
import { invoiceService } from './invoice.service';
const TABLE = 'tax_preparations';
const MAX_PDF_BYTES = 7 * 1024 * 1024;
export class TaxPreparationService {
    encryptionKey() {
        const secret = process.env.PAYER_TAX_ENCRYPTION_KEY || process.env.JWT_SECRET;
        if (!secret)
            throw new Error('Tax preparation encryption is not configured.');
        return createHash('sha256').update('loadmaster:tax-preparation:v1:').update(secret).digest();
    }
    encrypt(value) {
        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
        const ciphertext = Buffer.concat([
            cipher.update(JSON.stringify(value), 'utf8'),
            cipher.final(),
        ]);
        return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${ciphertext.toString('base64')}`;
    }
    decrypt(value) {
        const [version, encodedIv, encodedTag, encodedValue] = value.split(':');
        if (version !== 'v1' || !encodedIv || !encodedTag || !encodedValue) {
            throw new Error('Stored tax preparation has an unsupported encrypted format.');
        }
        const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), Buffer.from(encodedIv, 'base64'));
        decipher.setAuthTag(Buffer.from(encodedTag, 'base64'));
        const plaintext = Buffer.concat([
            decipher.update(Buffer.from(encodedValue, 'base64')),
            decipher.final(),
        ]).toString('utf8');
        return JSON.parse(plaintext);
    }
    snapshotData(preparation, testOnly) {
        return {
            testOnly,
            taxYear: preparation.taxYear,
            startDate: preparation.startDate,
            endDate: preparation.endDate,
            payer: preparation.payer,
            contractor: preparation.driver,
            qualifyingPaidEarnings: Number(preparation.driver.totalPaid),
            paidSettlementCount: Number(preparation.driver.paidSettlementCount),
        };
    }
    stableJson(value) {
        if (Array.isArray(value))
            return `[${value.map((item) => this.stableJson(item)).join(',')}]`;
        if (value && typeof value === 'object') {
            return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${this.stableJson(value[key])}`).join(',')}}`;
        }
        return JSON.stringify(value);
    }
    async getValidatedPreparation(companyId, input) {
        if (!Number.isInteger(input.taxYear) || input.taxYear < 2000 || input.taxYear > 9999) {
            throw new ValidationError('A valid tax year is required.');
        }
        const startDate = input.startDate || `${input.taxYear}-01-01`;
        const endDate = input.endDate || `${input.taxYear}-12-31`;
        if (input.testOnly) {
            if (env.NODE_ENV === 'production' || !env.ENABLE_1099_TEST_FIXTURE || input.taxYear !== 2026) {
                throw new NotFoundError('Development tax fixture is not available');
            }
            return invoiceService.getDevelopmentTaxFixture(input.taxYear, input.testMailingAddress);
        }
        if (!input.driverId)
            throw new ValidationError('A contractor is required.');
        const result = await invoiceService.validateTaxPreparation(companyId, input.driverId, {
            taxYear: input.taxYear,
            startDate,
            endDate,
        });
        if (!result.ready) {
            throw new ValidationError('1099-NEC cannot be prepared yet.', { missing: result.missing });
        }
        return result;
    }
    decodePdf(pdfBase64) {
        if (typeof pdfBase64 !== 'string' || !pdfBase64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(pdfBase64)) {
            throw new ValidationError('A generated preparation PDF is required.');
        }
        const pdf = Buffer.from(pdfBase64, 'base64');
        if (!pdf.length || pdf.length > MAX_PDF_BYTES || pdf.subarray(0, 5).toString('ascii') !== '%PDF-') {
            throw new ValidationError('The generated preparation PDF is invalid or too large.');
        }
        return pdf;
    }
    async create(companyId, input) {
        const preparation = await this.getValidatedPreparation(companyId, input);
        const snapshotData = this.snapshotData(preparation, Boolean(input.testOnly));
        if (this.stableJson(snapshotData) !== this.stableJson(input.expectedSnapshot)) {
            throw new ValidationError('Tax information changed after validation. Review the current data and generate the document again.');
        }
        const pdf = this.decodePdf(input.pdfBase64);
        const subjectKey = input.testOnly ? 'DEVELOPMENT-1099-FIXTURE' : preparation.driver.driverId;
        const snapshot = {
            ...snapshotData,
            pdfBase64: pdf.toString('base64'),
        };
        return db.transaction(async (trx) => {
            await trx.raw('SELECT pg_advisory_xact_lock(hashtext(?))', [
                `${companyId}:${subjectKey}:${preparation.taxYear}`,
            ]);
            const latest = await trx(TABLE)
                .where({ company_id: companyId, subject_key: subjectKey, tax_year: preparation.taxYear })
                .max('version as latest_version')
                .first();
            const version = Number(latest?.latest_version || 0) + 1;
            const inserted = await trx(TABLE).insert({
                company_id: companyId,
                driver_id: input.testOnly ? null : preparation.driver.driverId,
                subject_key: subjectKey,
                tax_year: preparation.taxYear,
                version,
                status: 'PREPARED',
                encrypted_data: this.encrypt(snapshot),
            }).returning(['id', 'tax_year', 'version', 'status', 'created_at']);
            const record = Array.isArray(inserted) ? inserted[0] : inserted;
            return {
                id: record.id,
                taxYear: record.tax_year,
                version: record.version,
                status: record.status,
                createdAt: record.created_at,
                driverId: record.driver_id,
                testOnly: snapshot.testOnly,
                driverName: preparation.driver.driverName,
                qualifyingPaidEarnings: preparation.driver.totalPaid,
                paidSettlementCount: preparation.driver.paidSettlementCount,
            };
        });
    }
    async list(companyId, taxYear) {
        let query = db(TABLE)
            .where({ company_id: companyId })
            .select('id', 'tax_year', 'version', 'status', 'created_at', 'encrypted_data')
            .orderBy('tax_year', 'desc')
            .orderBy('created_at', 'desc');
        if (taxYear !== undefined)
            query = query.where({ tax_year: taxYear });
        const records = await query;
        return records.map((record) => {
            const snapshot = this.decrypt(record.encrypted_data);
            return {
                id: record.id,
                taxYear: record.tax_year,
                version: record.version,
                status: record.status,
                createdAt: record.created_at,
                testOnly: snapshot.testOnly,
                driverName: snapshot.contractor?.driverName || '',
                mailingAddress: snapshot.contractor?.mailingAddress || '',
                mailingCity: snapshot.contractor?.mailingCity || '',
                mailingState: snapshot.contractor?.mailingState || '',
                mailingZip: snapshot.contractor?.mailingZip || '',
                qualifyingPaidEarnings: snapshot.qualifyingPaidEarnings,
                paidSettlementCount: snapshot.paidSettlementCount,
            };
        });
    }
    async getPdf(companyId, id) {
        const record = await db(TABLE).where({ id, company_id: companyId }).first();
        if (!record)
            throw new NotFoundError('Tax preparation record not found.');
        const snapshot = this.decrypt(record.encrypted_data);
        const safeName = String(snapshot.contractor?.driverName || 'contractor')
            .replace(/[^a-zA-Z0-9-_ ]/g, '')
            .trim()
            .replace(/\s+/g, '-') || 'contractor';
        const prefix = snapshot.testOnly ? '1099-NEC-TEST' : '1099-NEC';
        return {
            pdf: Buffer.from(snapshot.pdfBase64, 'base64'),
            filename: `${prefix}-${safeName}-${record.tax_year}-v${record.version}.pdf`,
        };
    }
}
export const taxPreparationService = new TaxPreparationService();
