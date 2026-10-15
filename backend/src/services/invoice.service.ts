import db from '../config/database';
import { invoiceRepository } from '../repositories/invoice.repository';
import { loadRepository } from '../repositories/load.repository';
import { loadAssignmentRepository } from '../repositories/load-assignment.repository';
import { brokerRepository } from '../repositories/broker.repository';
import { driverRepository } from '../repositories/driver.repository';
import { NotFoundError, ValidationError } from '../utils/errors';
import { companyService } from './company.service';
import { env } from '../config/env';

export class InvoiceService {
  private resolveConfirmedDate(value: unknown, fieldName: string) {
    if (value === undefined || value === null || value === '') {
      return new Date().toISOString().slice(0, 10);
    }
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new ValidationError(`Invalid ${fieldName}`);
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new ValidationError(`Invalid ${fieldName}`);
    }
    return value;
  }

  async getAll(companyId: string, filters: any = {}, pagination: any = {}) {
    try {
      return await invoiceRepository.findAll(companyId, filters, pagination);
    } catch (error: any) {
      console.error('Error in getAll:', error);
      // Return empty result instead of throwing
      return { data: [], total: 0 };
    }
  }

  async getById(companyId: string, id: string) {
    const invoice = await invoiceRepository.findById(companyId, id);
    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }
    return invoice;
  }

  async create(companyId: string, invoiceData: any) {
    const normalized = { ...invoiceData };
    const loadId = normalized.load_id || normalized.loadId || null;
    let brokerId = normalized.broker_id || normalized.brokerId || null;
    let driverId = normalized.driver_id || normalized.driverId || null;
    let rateValue = normalized.rate ?? normalized.lineHaulRate ?? 0;
    const invoiceNumber = (normalized.invoice_number || normalized.invoiceNumber || '').trim();
    let brokerName = (normalized.broker_name || normalized.brokerName || '').trim();

    if (!loadId) throw new ValidationError('A load is required to create an invoice');

    if (loadId) {
      const load = await loadRepository.findById(companyId, loadId);
      if (!load) {
        throw new NotFoundError('Load not found');
      }
      brokerId = brokerId || load.broker_id;
      const assignment = await loadAssignmentRepository.findActiveByLoad(loadId, companyId)
        || (await loadAssignmentRepository.findHistoryByLoad(loadId, companyId))[0];
      driverId = driverId || assignment?.driver_id || null;
      rateValue = normalized.rate ?? load.rate ?? 0;
    }

    if (driverId && !(await driverRepository.findById(companyId, driverId))) {
      throw new NotFoundError('Driver not found');
    }

    if (brokerId) {
      const broker = await brokerRepository.findById(companyId, brokerId);
      if (!broker) {
        throw new NotFoundError('Broker not found');
      }
      brokerName = brokerName || broker.name;
    }

    const rate = Number(rateValue);
    const accessorials = Array.isArray(normalized.accessorials) ? normalized.accessorials : [];
    if (accessorials.some((item: any) => Number.isNaN(Number(item.amount)) || Number(item.amount) < 0)) {
      throw new ValidationError('Accessorial charges must be valid non-negative numbers');
    }
    const extras = accessorials.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);

    if (!invoiceNumber) {
      throw new ValidationError('Invoice number is required');
    }

    if (!brokerName) {
      throw new ValidationError('Broker name is required');
    }

    if (Number.isNaN(rate) || rate < 0) {
      throw new ValidationError('Rate must be a valid number');
    }

    if (Number.isNaN(extras) || extras < 0) {
      throw new ValidationError('Accessorial charges must be a valid number');
    }

    const totalAmount = rate + extras;

    const invoice = await invoiceRepository.create(companyId, {
      load_id: loadId,
      broker_id: brokerId,
      driver_id: driverId,
      invoice_number: invoiceNumber,
      rate,
      extras,
      accessorials,
      total_amount: totalAmount,
      currency: normalized.currency || 'USD',
      invoice_date: normalized.invoice_date || normalized.invoiceDate || new Date().toISOString().slice(0, 10),
      date_factored: normalized.date_factored || normalized.dateFactored || normalized.invoice_date || normalized.invoiceDate || new Date().toISOString().slice(0, 10),
      invoice_sent_date: normalized.invoice_sent_date || normalized.invoiceSentDate || null,
      payment_received_date: normalized.payment_received_date || normalized.paymentReceivedDate || null,
      payment_status: normalized.payment_status || normalized.paymentStatus || 'UNPAID',
      status: normalized.status || 'PENDING',
      notes: normalized.notes || null,
    });

    return invoice;
  }

  async update(companyId: string, id: string, updateData: any) {
    const invoice = await invoiceRepository.findById(companyId, id);
    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    const dataToUpdate: any = {};

    for (const field of ['date_factored', 'invoice_date', 'invoice_sent_date', 'payment_received_date']) {
      if (updateData[field] && Number.isNaN(new Date(updateData[field]).getTime())) {
        throw new ValidationError(`Invalid ${field.replace(/_/g, ' ')}`);
      }
    }

    if (updateData.accessorials !== undefined) {
      if (!Array.isArray(updateData.accessorials) || updateData.accessorials.some((item: any) => Number.isNaN(Number(item.amount)) || Number(item.amount) < 0)) {
        throw new ValidationError('Accessorial charges must be valid non-negative numbers');
      }
      dataToUpdate.accessorials = updateData.accessorials;
      dataToUpdate.extras = updateData.accessorials.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
    }

    if (updateData.rate !== undefined || updateData.extras !== undefined || updateData.accessorials !== undefined) {
      const rate = updateData.rate !== undefined ? parseFloat(updateData.rate) : parseFloat(invoice.rate);
      const extras = updateData.accessorials !== undefined
        ? dataToUpdate.extras
        : updateData.extras !== undefined ? parseFloat(updateData.extras) : parseFloat(invoice.extras || 0);
      if (Number.isNaN(rate) || rate < 0 || Number.isNaN(extras) || extras < 0) throw new ValidationError('Invoice amounts must be non-negative numbers');
      dataToUpdate.rate = rate;
      dataToUpdate.extras = extras;
      dataToUpdate.total_amount = rate + extras;
    }

    if (updateData.status !== undefined) {
      const allowed: Record<string, string[]> = { PENDING: ['SENT'], SENT: ['PAID'], PAID: [] };
      if (updateData.status !== invoice.status && !(allowed[invoice.status] || []).includes(updateData.status)) {
        throw new ValidationError(`Invalid invoice status transition from ${invoice.status} to ${updateData.status}`);
      }
      dataToUpdate.status = updateData.status;
    }

    if (updateData.payment_status !== undefined) {
      dataToUpdate.payment_status = updateData.payment_status;
      if (updateData.payment_status === 'PAID') {
        dataToUpdate.payment_received_date = new Date();
      }
    }

    if (updateData.invoice_sent_date !== undefined) {
      dataToUpdate.invoice_sent_date = updateData.invoice_sent_date;
      dataToUpdate.status = updateData.status || 'SENT';
    }

    if (updateData.notes !== undefined) {
      dataToUpdate.notes = updateData.notes;
    }

    for (const field of ['date_factored', 'invoice_date', 'invoice_sent_date', 'payment_received_date']) {
      if (updateData[field] !== undefined) dataToUpdate[field] = updateData[field] || null;
    }

    return invoiceRepository.update(companyId, id, dataToUpdate);
  }

  async delete(companyId: string, id: string) {
    const invoice = await invoiceRepository.findById(companyId, id);
    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }
    return invoiceRepository.delete(companyId, id);
  }

  async markAsSent(companyId: string, id: string, confirmedDate?: unknown) {
    const invoice = await invoiceRepository.findById(companyId, id);
    if (!invoice) throw new NotFoundError('Invoice not found');
    if (invoice.status === 'PAID') throw new ValidationError('Paid invoices cannot be marked as sent');
    if (invoice.status === 'SENT') return invoice;
    return this.update(companyId, id, {
      status: 'SENT',
      invoice_sent_date: this.resolveConfirmedDate(confirmedDate, 'invoice sent date'),
    });
  }

  async markAsPaid(companyId: string, id: string, confirmedDate?: unknown) {
    const invoice = await invoiceRepository.findById(companyId, id);
    if (!invoice) throw new NotFoundError('Invoice not found');
    if (invoice.status !== 'SENT') throw new ValidationError('Only sent invoices can be marked as paid');
    return this.update(companyId, id, {
      status: 'PAID',
      payment_status: 'PAID',
      payment_received_date: this.resolveConfirmedDate(confirmedDate, 'payment received date'),
    });
  }

  async getInvoiceStats(companyId: string) {
    try {
      return await invoiceRepository.getInvoiceStats(companyId);
    } catch (error: any) {
      console.error('Error getting invoice stats:', error);
      return {
        total_invoices: 0,
        unpaid_amount: 0,
        paid_amount: 0,
        total_amount: 0,
      };
    }
  }

  async getTaxSummary(companyId: string, filters: any = {}) {
    try {
      const include = (filters.include || 'PAID').toUpperCase();
      const startDate = filters.startDate || `${new Date().getFullYear()}-01-01`;
      const endDate = filters.endDate || `${new Date().getFullYear()}-12-31`;

      const effectiveStart = startDate;
      const effectiveEnd = endDate;

      let query = db('invoices')
        .select(
          'drivers.id as driver_id',
          db.raw("CONCAT(COALESCE(drivers.first_name, ''), ' ', COALESCE(drivers.last_name, '')) as driver_name"),
          'drivers.mailing_address',
          'drivers.mailing_city',
          'drivers.mailing_state',
          'drivers.mailing_zip',
          'drivers.tin',
          db.raw('COUNT(*) as paid_settlement_count'),
          db.raw('SUM(CAST(invoices.total_amount AS DECIMAL(10,2))) as total_paid')
        )
        .leftJoin('drivers', function () {
          this.on('invoices.driver_id', 'drivers.id').andOn('invoices.company_id', 'drivers.company_id');
        })
        .where('invoices.company_id', companyId)
        .whereNotNull('invoices.driver_id')
        .whereNotIn('invoices.status', ['CANCELLED', 'VOIDED'])
        .whereRaw("COALESCE(invoices.payment_received_date, invoices.invoice_date, invoices.date_factored, CAST(invoices.created_at AS DATE)) >= ?", [effectiveStart])
        .whereRaw("COALESCE(invoices.payment_received_date, invoices.invoice_date, invoices.date_factored, CAST(invoices.created_at AS DATE)) <= ?", [effectiveEnd]);

      if (include === 'PAID') {
        query = query.where('invoices.payment_status', 'PAID');
      } else if (include === 'ALL') {
        query = query.whereNot('invoices.payment_status', 'UNPAID');
      }

      const rows = await query
        .groupBy(
          'drivers.id', 'drivers.first_name', 'drivers.last_name', 'drivers.mailing_address',
          'drivers.mailing_city', 'drivers.mailing_state', 'drivers.mailing_zip', 'drivers.tin'
        )
        .orderByRaw('SUM(CAST(invoices.total_amount AS DECIMAL(10,2))) DESC');

      const data = (rows || []).map((row: any) => ({
        driverId: row.driver_id,
        driverName: row.driver_name || 'Unknown Driver',
        mailingAddress: row.mailing_address || '',
        mailingCity: row.mailing_city || '',
        mailingState: row.mailing_state || '',
        mailingZip: row.mailing_zip || '',
        tin: row.tin || '',
        paidSettlementCount: Number(row.paid_settlement_count || 0),
        totalPaid: Number(row.total_paid || 0),
      }));

      const total = data.reduce((sum: number, row: any) => sum + Number(row.totalPaid || 0), 0);

      return {
        summary: {
          driverCount: data.length,
          total,
          startDate: effectiveStart,
          endDate: effectiveEnd,
        },
        rows: data,
      };
    } catch (error: any) {
      console.error('Error getting tax summary:', error);
      throw error;
    }
  }

  async validateTaxPreparation(companyId: string, driverId: string, filters: any = {}) {
      const startDate = filters.startDate || `${new Date().getFullYear()}-01-01`;
      const endDate = filters.endDate || `${new Date().getFullYear()}-12-31`;
      const taxYear = Number(filters.taxYear);
      const missing: string[] = [];
      const company = await companyService.getForCompany(companyId);
      const payerEin = await companyService.getPayerEin(companyId);

      if (!company.name?.trim()) missing.push('Payer legal business name');
      if (!payerEin) missing.push('Payer EIN/TIN');
      if (!company.addressLine1?.trim()) missing.push('Payer mailing address');
      if (!company.city?.trim()) missing.push('Payer city');
      if (!company.state?.trim()) missing.push('Payer state');
      if (!company.zipCode?.trim()) missing.push('Payer ZIP');
      if (!Number.isInteger(taxYear) || taxYear < 2000 || taxYear > 9999) missing.push('Tax year');

      const row = await db('invoices')
        .select(
          'drivers.id as driver_id',
          db.raw("CONCAT(COALESCE(drivers.first_name, ''), ' ', COALESCE(drivers.last_name, '')) as driver_name"),
          'drivers.tin',
          'drivers.mailing_address',
          'drivers.mailing_city',
          'drivers.mailing_state',
          'drivers.mailing_zip',
          db.raw('COUNT(*) as paid_settlement_count'),
          db.raw('SUM(CAST(invoices.total_amount AS DECIMAL(10,2))) as total_paid')
        )
        .leftJoin('drivers', function () {
          this.on('invoices.driver_id', 'drivers.id').andOn('invoices.company_id', 'drivers.company_id');
        })
        .where('invoices.company_id', companyId)
        .where('invoices.driver_id', driverId)
        .whereNotIn('invoices.status', ['CANCELLED', 'VOIDED'])
        .where('invoices.payment_status', 'PAID')
        .whereRaw("COALESCE(invoices.payment_received_date, invoices.invoice_date, invoices.date_factored, CAST(invoices.created_at AS DATE)) >= ?", [startDate])
        .whereRaw("COALESCE(invoices.payment_received_date, invoices.invoice_date, invoices.date_factored, CAST(invoices.created_at AS DATE)) <= ?", [endDate])
        .groupBy(
          'drivers.id', 'drivers.first_name', 'drivers.last_name', 'drivers.tin',
          'drivers.mailing_address', 'drivers.mailing_city', 'drivers.mailing_state', 'drivers.mailing_zip'
        )
        .first();

      if (!row) {
        missing.push('Qualifying paid earnings');
        return { ready: false, status: 'MISSING_TAX_INFORMATION', missing };
      }

      if (!String(row.driver_name || '').trim()) missing.push('Contractor legal/tax name');
      const contractorTin = String(row.tin || '').trim();
      if (!contractorTin || /^TEST(?:[-\s]|$)/i.test(contractorTin)) missing.push('Contractor TIN');
      if (!String(row.mailing_address || '').trim()) missing.push('Contractor mailing address');
      if (!String(row.mailing_city || '').trim()) missing.push('Contractor city');
      if (!String(row.mailing_state || '').trim()) missing.push('Contractor state');
      if (!String(row.mailing_zip || '').trim()) missing.push('Contractor ZIP');
      if (Number(row.total_paid || 0) <= 0) missing.push('Qualifying paid earnings');

      return {
        ready: missing.length === 0,
        status: missing.length === 0 ? 'READY_TO_PREPARE' : 'MISSING_TAX_INFORMATION',
        missing,
        driver: {
          driverId: row.driver_id,
          driverName: row.driver_name || '',
          tin: row.tin || '',
          mailingAddress: row.mailing_address || '',
          mailingCity: row.mailing_city || '',
          mailingState: row.mailing_state || '',
          mailingZip: row.mailing_zip || '',
          paidSettlementCount: Number(row.paid_settlement_count || 0),
          totalPaid: Number(row.total_paid || 0),
        },
        payer: {
          name: company.name,
          addressLine1: company.addressLine1 || '',
          city: company.city || '',
          state: company.state || '',
          zipCode: company.zipCode || '',
          tin: payerEin,
        },
        taxYear,
        startDate,
        endDate,
      };
  }

  getDevelopmentTaxFixture(taxYear: number, contractorMailingAddress?: string) {
      if (env.NODE_ENV === 'production' || !env.ENABLE_1099_TEST_FIXTURE) {
        throw new NotFoundError('Development tax fixture is not available');
      }

      if (taxYear !== 2026) {
        throw new ValidationError('The development test fixture is available for tax year 2026 only.');
      }

      const mailingAddress = contractorMailingAddress?.trim() || '1200 Market Street';
      if (mailingAddress.length > 255) {
        throw new ValidationError('Development test mailing address must be 255 characters or fewer.');
      }

      return {
        ready: true,
        status: 'READY_TO_PREPARE',
        testOnly: true,
        warning: 'TEST DATA — NOT A REAL TAX IDENTIFIER. This fixture is not for filing.',
        missing: [],
        driver: {
          driverId: 'development-test-fixture',
          driverName: 'Daniely Gift',
          tin: 'TEST-ONLY-NOT-A-REAL-TIN',
          mailingAddress,
          mailingCity: 'Dallas',
          mailingState: 'TX',
          mailingZip: '75201',
          paidSettlementCount: 3,
          totalPaid: 4031.59,
        },
        payer: {
          name: 'Danny Logistics LLC',
          addressLine1: '1200 Market Street',
          city: 'Dallas',
          state: 'TX',
          zipCode: '75201',
          tin: 'TEST-ONLY-NOT-A-REAL-EIN',
        },
        taxYear,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      };
  }

  async getInvoicesByLoadId(companyId: string, loadId: string) {
    return invoiceRepository.findByLoadId(companyId, loadId);
  }
}

export const invoiceService = new InvoiceService();
