import db from '../config/database';
import { settlementRepository } from '../repositories/settlement.repository';
import { settlementAdjustmentRepository, SettlementAdjustmentInput } from '../repositories/settlement-adjustment.repository';
import { recurringDeductionTemplateRepository, RecurringDeductionTemplateInput } from '../repositories/recurring-deduction-template.repository';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { driverCompensationService } from './driver-compensation.service';
import { notificationService } from './notification.service';

export class SettlementService {
  private toNumber(value: any, fallback = 0) {
    const numericValue = Number(value ?? fallback);
    return Number.isFinite(numericValue) ? numericValue : fallback;
  }

  private getAdjustmentValue(payload: any, keys: string[]) {
    for (const key of keys) {
      if (payload[key] !== undefined && payload[key] !== null) {
        return this.toNumber(payload[key], 0);
      }
    }

    return 0;
  }

  private calculateNetAmount(baseDriverPay: number, payload: any = {}) {
    const bonusAmount = this.getAdjustmentValue(payload, ['bonus_amount', 'bonusAmount', 'bonus']);
    const reimbursementsAmount = this.getAdjustmentValue(payload, ['reimbursements_amount', 'reimbursementsAmount', 'reimbursement_amount', 'reimbursementAmount']);
    const accessorialAmount = this.getAdjustmentValue(payload, ['accessorial_amount', 'accessorialAmount', 'accessorials_amount', 'accessorialsAmount']);
    const deductionsAmount = this.getAdjustmentValue(payload, ['deductions_amount', 'deductionsAmount', 'deduction_amount', 'deductionAmount']);

    return baseDriverPay + bonusAmount + reimbursementsAmount + accessorialAmount - deductionsAmount;
  }

  private normalizeLoadIds(loadIds: string[]) {
    return [...new Set((loadIds || []).map((id) => String(id).trim()).filter(Boolean))];
  }

  private normalizeRecurringDeductions(value: any) {
    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) throw new Error('Stored recurring deduction snapshot is not an array.');
        return parsed;
      } catch (error) {
        throw new Error(`Unable to read recurring deduction snapshot: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    throw new Error('Stored recurring deduction snapshot has an unsupported format.');
  }

  private recurringDeductionAmount(snapshot: any[]) {
    return snapshot.reduce((total, item) => total + this.toNumber(item.amount), 0);
  }

  private withRecurringAdjustments(adjustments: any[], snapshot: any[]) {
    const recurringAdjustments = snapshot.map((item) => ({
      id: `recurring-${item.template_id}`,
      category: 'DEDUCTION',
      type: 'RECURRING_DEDUCTION',
      description: item.description,
      amount: Number(item.amount),
      recurring: true,
    }));
    return [...adjustments, ...recurringAdjustments];
  }

  private async validateRecurringDeduction(companyId: string, payload: any, current?: any): Promise<RecurringDeductionTemplateInput> {
    const rawDriverId = payload.driver_id !== undefined ? payload.driver_id : current?.driver_id;
    const driverId = rawDriverId === '' || rawDriverId === null || rawDriverId === undefined ? null : String(rawDriverId);
    const description = String(payload.description !== undefined ? payload.description : current?.description || '').trim();
    const amount = Number(payload.amount !== undefined ? payload.amount : current?.amount);
    const isActive = payload.is_active !== undefined ? payload.is_active : current?.is_active ?? true;

    if (driverId) {
      const driver = await db('drivers').where({ id: driverId, company_id: companyId }).first();
      if (!driver) throw new NotFoundError('Driver not found');
    }
    if (!description) throw new ValidationError('Recurring deduction description is required.');
    if (!Number.isFinite(amount) || amount <= 0) throw new ValidationError('Recurring deduction amount must be greater than zero.');
    if (typeof isActive !== 'boolean') throw new ValidationError('Recurring deduction active status must be true or false.');

    return { driver_id: driverId, description, amount, is_active: isActive };
  }

  async getRecurringDeductions(companyId: string) {
    return recurringDeductionTemplateRepository.findAll(companyId);
  }

  async createRecurringDeduction(companyId: string, payload: any) {
    const input = await this.validateRecurringDeduction(companyId, payload);
    return recurringDeductionTemplateRepository.create(companyId, input);
  }

  async updateRecurringDeduction(companyId: string, id: string, payload: any) {
    const existing = await recurringDeductionTemplateRepository.findById(companyId, id);
    if (!existing) throw new NotFoundError('Recurring deduction template not found');
    const input = await this.validateRecurringDeduction(companyId, payload, existing);
    const updated = await recurringDeductionTemplateRepository.update(companyId, id, input);
    if (!updated) throw new NotFoundError('Recurring deduction template not found');
    return updated;
  }

  async deleteRecurringDeduction(companyId: string, id: string) {
    const deleted = await recurringDeductionTemplateRepository.delete(companyId, id);
    if (!deleted) throw new NotFoundError('Recurring deduction template not found');
    return { id, deleted: true };
  }

  async getAll(companyId: string, filters: any = {}) {
    const rows = await settlementRepository.findAll(companyId, filters);

    return Promise.all(rows.map((row: any) => this.withAdjustmentTotals(companyId, row)));
  }

  async getForDriver(companyId: string, driverId: string, settlementId?: string) {
    const rows = await settlementRepository.findByDriverId(companyId, driverId, settlementId);
    if (settlementId && !rows[0]) throw new NotFoundError('Settlement not found');
    return Promise.all(rows.map((row: any) => this.withAdjustmentTotals(companyId, row)));
  }

  async getById(companyId: string, settlementId: string) {
    const row = await settlementRepository.findById(companyId, settlementId);
    if (!row) throw new NotFoundError('Settlement not found');
    return this.withAdjustmentTotals(companyId, row);
  }

  private async withAdjustmentTotals(companyId: string, row: any) {
    const recurringSnapshot = this.normalizeRecurringDeductions(row.recurring_deductions_snapshot);
    const recurringAmount = this.recurringDeductionAmount(recurringSnapshot);
    const persistedAdjustments = await settlementAdjustmentRepository.findBySettlement(companyId, row.id);
    const adjustments = this.withRecurringAdjustments(persistedAdjustments, recurringSnapshot);
    const initialDeductions = Number(row.deductions_amount || 0);
    if (String(row.status || '').toUpperCase() === 'PAID') {
      const summary = await settlementAdjustmentRepository.summarizeBySettlement(companyId, row.id);
      const grossAmount = Number(row.gross_amount || 0);
      return {
        ...row,
        base_driver_pay: grossAmount - summary.earnings,
        gross_amount: grossAmount,
        net_amount: Number(row.amount_paid ?? row.net_amount ?? row.driver_pay ?? 0),
        driver_pay: Number(row.amount_paid ?? row.net_amount ?? row.driver_pay ?? 0),
        earnings_adjustments: summary.earnings,
        deductions_amount: initialDeductions + summary.deductions + recurringAmount,
        recurring_deductions_amount: recurringAmount,
        recurring_deductions_snapshot: recurringSnapshot,
        load_ids: Array.isArray(row.load_ids) ? row.load_ids : JSON.parse(row.load_ids || '[]'),
        adjustments,
      };
    }
    const summary = await settlementAdjustmentRepository.summarizeBySettlement(companyId, row.id);
    const loadIds = Array.isArray(row.load_ids) ? row.load_ids : JSON.parse(row.load_ids || '[]');
    const loadRevenue = loadIds.length
      ? await db('loads').where({ company_id: companyId }).whereIn('id', loadIds).sum('rate as total').first()
      : { total: 0 };
    const driver = await db('drivers')
      .leftJoin('users', function () {
        this.on('users.id', 'drivers.user_id').andOn('users.company_id', 'drivers.company_id');
      })
      .where({ 'drivers.id': row.driver_id, 'drivers.company_id': companyId })
      .select('users.pay_percentage')
      .first();
    const compensationSnapshot = Array.isArray(row.compensation_snapshot)
      ? row.compensation_snapshot
      : (typeof row.compensation_snapshot === 'string' ? JSON.parse(row.compensation_snapshot) : null);
    const initialEarnings = Number(row.bonus_amount || 0)
      + Number(row.reimbursements_amount || 0)
      + Number(row.accessorial_amount || 0);
    const basePay = compensationSnapshot
      ? Number(row.driver_pay || 0) - initialEarnings + initialDeductions + recurringAmount
      : Number(loadRevenue?.total || 0) * (Number(driver?.pay_percentage || 0) / 100);
    const grossAmount = compensationSnapshot
      ? Number(row.gross_amount || 0)
      : basePay + summary.earnings;
    const netAmount = compensationSnapshot
      ? Number(row.driver_pay || 0) + summary.earnings - summary.deductions
      : basePay + summary.earnings - summary.deductions;
    return {
      ...row,
      base_driver_pay: basePay,
      gross_amount: grossAmount,
      driver_pay: netAmount,
      earnings_adjustments: initialEarnings + summary.earnings,
      deductions_amount: initialDeductions + summary.deductions + recurringAmount,
      recurring_deductions_amount: recurringAmount,
      recurring_deductions_snapshot: recurringSnapshot,
      net_amount: netAmount,
      load_ids: loadIds,
      adjustments,
    };
  }

  async getAdjustments(companyId: string, settlementId: string) {
    const existing = await settlementRepository.findById(companyId, settlementId);
    if (!existing) throw new NotFoundError('Settlement not found');
    return settlementAdjustmentRepository.findBySettlement(companyId, settlementId);
  }

  async addAdjustment(companyId: string, userId: string, settlementId: string, payload: any) {
    const existing = await settlementRepository.findById(companyId, settlementId);
    if (!existing) throw new NotFoundError('Settlement not found');
    if (['APPROVED', 'PAID'].includes(String(existing.status || '').toUpperCase())) {
      throw new ConflictError('Approved settlements are locked and cannot be modified.');
    }

    const category = String(payload.category || '').toUpperCase();
    const type = String(payload.type || '').toUpperCase();
    const description = String(payload.description || '').trim();
    const amount = Number(payload.amount);

    if (!['EARNING', 'DEDUCTION'].includes(category)) {
      throw new ValidationError('Adjustment category must be EARNING or DEDUCTION.');
    }
    if (category === 'EARNING' && type !== 'BONUS') {
      throw new ValidationError('EARNING adjustments must use type BONUS.');
    }
    if (category === 'DEDUCTION' && !['OTHER', 'FUEL_ADVANCE'].includes(type)) {
      throw new ValidationError('Deduction type must be OTHER or FUEL_ADVANCE.');
    }
    if (!description) throw new ValidationError('Adjustment description is required.');
    if (!Number.isFinite(amount) || amount <= 0) throw new ValidationError('Adjustment amount must be greater than zero.');

    const input: SettlementAdjustmentInput = {
      settlement_id: settlementId,
      driver_id: existing.driver_id,
      load_id: payload.load_id || null,
      category,
      type,
      description,
      amount,
      created_by: userId,
    };
    return settlementAdjustmentRepository.create(companyId, input);
  }

  async updateStatus(companyId: string, userId: string, settlementId: string, targetStatus: string) {
    const settlement = await settlementRepository.findById(companyId, settlementId);
    if (!settlement) throw new NotFoundError('Settlement not found');
    const current = String(settlement.status || 'DRAFT').toUpperCase();
    const target = String(targetStatus || '').toUpperCase();
    const transitions: Record<string, string[]> = {
      UNPAID: ['PENDING'],
      DRAFT: ['PENDING'],
      PENDING: ['APPROVED'],
      REVIEW: ['APPROVED'],
      APPROVED: [],
    };
    if (!(transitions[current] || []).includes(target)) {
      throw new ConflictError(`Invalid settlement status transition from ${current} to ${target}.`);
    }
    const data = target === 'PENDING'
      ? { status: 'PENDING', submitted_by: userId, submitted_at: new Date() }
      : { status: 'APPROVED', approved_by: userId, approved_at: new Date() };
    return db.transaction(async (trx) => {
      const updated = await settlementRepository.updateStatus(companyId, settlementId, data, trx);
      if (updated) {
        await notificationService.notifyAssignedDriver(companyId, settlement.driver_id, {
          type: target === 'APPROVED' ? 'SETTLEMENT_FINALIZED' : 'SETTLEMENT_STATUS_UPDATED',
          title: target === 'APPROVED' ? 'Settlement finalized' : 'Settlement submitted',
          message: `Your settlement for ${settlement.period_start} to ${settlement.period_end} is ${target.toLowerCase()}.`,
          relatedEntityType: 'SETTLEMENT',
          relatedEntityId: settlementId,
          priority: target === 'APPROVED' ? 'HIGH' : 'NORMAL',
        }, trx);
      }
      return updated;
    });
  }

  async markPaid(companyId: string, userId: string, settlementId: string) {
    const settlement = await settlementRepository.findById(companyId, settlementId);
    if (!settlement) throw new NotFoundError('Settlement not found');
    if (String(settlement.status || '').toUpperCase() !== 'APPROVED') {
      throw new ConflictError('Only approved settlements can be marked as paid.');
    }

    const snapshot = await this.withAdjustmentTotals(companyId, settlement);
    const paymentDate = new Date();
    const paid = await db.transaction(async (trx) => {
      const updated = await settlementRepository.markPaid(companyId, settlementId, {
        payment_date: paymentDate,
        paid_by: userId,
        amount_paid: Number(snapshot.net_amount || 0),
        gross_amount: Number(snapshot.gross_amount || 0),
        driver_pay: Number(snapshot.net_amount || 0),
        net_amount: Number(snapshot.net_amount || 0),
      }, trx);
      if (updated) {
        await notificationService.notifyAssignedDriver(companyId, settlement.driver_id, {
          type: 'SETTLEMENT_PAYMENT_UPDATED',
          title: 'Settlement paid',
          message: `Payment for your settlement (${settlement.period_start} to ${settlement.period_end}) has been recorded.`,
          relatedEntityType: 'SETTLEMENT',
          relatedEntityId: settlementId,
          priority: 'HIGH',
        }, trx);
      }
      return updated;
    });

    if (!paid) {
      throw new ConflictError('Settlement was already paid or is no longer approved.');
    }

    return paid;
  }

  async reconcileLoads(companyId: string, driverId: string, startDate: string, endDate: string) {
    if (!driverId || !startDate || !endDate) {
      throw new ConflictError('Driver, period start, and period end are required.');
    }

    const driver = await db('drivers').where({ id: driverId, company_id: companyId }).first('id');
    if (!driver) throw new NotFoundError('Driver not found');

    const loads = await db('load_assignments as la')
      .join('loads', 'loads.id', 'la.load_id')
      .leftJoin('drivers', function () {
        this.on('drivers.id', 'la.driver_id').andOn('drivers.company_id', 'loads.company_id');
      })
      .leftJoin('users', function () {
        this.on('users.id', 'drivers.user_id').andOn('users.company_id', 'drivers.company_id');
      })
      .where('loads.company_id', companyId)
      .where('la.driver_id', driverId)
      .where('loads.status', 'delivered')
      .whereRaw('DATE(COALESCE(loads.updated_at, loads.created_at)) BETWEEN ? AND ?', [startDate, endDate])
      .select(
        'loads.id as id',
        'loads.load_number as load_number',
        'loads.rate as gross_amount',
        'loads.equipment_type as equipment_type',
        'loads.loaded_miles as loaded_miles',
        'loads.deadhead_miles as deadhead_miles',
        'loads.status as status',
        'loads.updated_at as delivered_at',
        'drivers.first_name as driver_first_name',
        'drivers.last_name as driver_last_name',
        'users.pay_percentage as pay_percentage'
      )
      .orderBy('loads.updated_at', 'desc');

    const normalizedLoads = await Promise.all(loads.map(async (load: any) => {
      const compensation = await driverCompensationService.getConfig(driverId, load.equipment_type);
      const applicableCompensation = compensation.source === 'LEGACY_PERCENTAGE' && load.pay_percentage !== undefined
        ? { ...compensation, rate: Number(load.pay_percentage || 0) }
        : compensation;
      const gross = Number(load.gross_amount || 0);
      return {
        id: load.id,
        load_number: load.load_number,
        gross_amount: gross,
        driver_pay: driverCompensationService.calculate(applicableCompensation, { ...load, rate: gross }),
        compensation_type: applicableCompensation.payType,
        compensation_rate: applicableCompensation.rate,
        delivered_at: load.delivered_at,
        status: load.status,
        driver_first_name: load.driver_first_name,
        driver_last_name: load.driver_last_name,
      };
    }));

    return {
      driver_id: driverId,
      driver_name: normalizedLoads[0]
        ? `${normalizedLoads[0].driver_first_name || ''} ${normalizedLoads[0].driver_last_name || ''}`.trim() || 'Driver'
        : 'Driver',
      period_start: startDate,
      period_end: endDate,
      total_loads: normalizedLoads.length,
      gross_amount: normalizedLoads.reduce((sum, load) => sum + Number(load.gross_amount || 0), 0),
      driver_pay: normalizedLoads.reduce((sum, load) => sum + Number(load.driver_pay || 0), 0),
      compensation_snapshot: normalizedLoads.map((load) => ({
        load_id: load.id,
        compensation_type: load.compensation_type,
        compensation_rate: load.compensation_rate,
      })),
      loads: normalizedLoads,
    };
  }

  async create(companyId: string, userId: string, payload: any) {
    const driverId = payload.driver_id;
    const startDate = payload.period_start;
    const endDate = payload.period_end;
    const bonusAmount = this.getAdjustmentValue(payload, ['bonus_amount', 'bonusAmount', 'bonus']);
    const reimbursementsAmount = this.getAdjustmentValue(payload, ['reimbursements_amount', 'reimbursementsAmount', 'reimbursement_amount', 'reimbursementAmount']);
    const accessorialAmount = this.getAdjustmentValue(payload, ['accessorial_amount', 'accessorialAmount', 'accessorials_amount', 'accessorialsAmount']);
    const deductionsAmount = this.getAdjustmentValue(payload, ['deductions_amount', 'deductionsAmount', 'deduction_amount', 'deductionAmount']);

    if (!driverId || !startDate || !endDate) {
      throw new ConflictError('Driver and settlement dates are required.');
    }

    const driver = await db('drivers').where({ id: driverId, company_id: companyId }).first();
    if (!driver) throw new NotFoundError('Driver not found');

    const driverName = `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Driver';
    const reconciliation = await this.reconcileLoads(companyId, driverId, startDate, endDate);
    const finalLoadIds = this.normalizeLoadIds(reconciliation.loads.map((load: any) => load.id));

    if (finalLoadIds.length === 0) {
      throw new ConflictError('No delivered loads were found for this driver and date range.');
    }

    const currentSettlements = await settlementRepository.findAll(companyId, { driver_id: driverId });
    const duplicate = currentSettlements.find((settlement: any) => {
      if (['CANCELLED', 'VOIDED'].includes(String(settlement.status || '').toUpperCase())) return false;
      const existingLoadIds = Array.isArray(settlement.load_ids)
        ? settlement.load_ids
        : JSON.parse(settlement.load_ids || '[]');
      return existingLoadIds.some((id: string) => finalLoadIds.includes(String(id)));
    });

    if (duplicate) {
      throw new ConflictError('One or more delivered loads are already included in an active settlement for this driver.');
    }

    const recurringTemplates = await recurringDeductionTemplateRepository.findApplicable(companyId, driverId);
    const recurringDeductionsSnapshot = recurringTemplates.map((template: any) => ({
      template_id: template.id,
      driver_id: template.driver_id,
      description: template.description,
      amount: Number(template.amount),
    }));
    const recurringDeductionsAmount = this.recurringDeductionAmount(recurringDeductionsSnapshot);
    const grossAmount = reconciliation.gross_amount || 0;
    const baseDriverPay = this.toNumber(reconciliation.driver_pay || 0);
    const driverPay = this.calculateNetAmount(baseDriverPay, payload) - recurringDeductionsAmount;
    const netAmount = driverPay;

    const settlement = await db.transaction(async (trx) => {
      const created = await settlementRepository.create(companyId, {
      driver_id: driverId,
      driver_name: driverName,
      status: 'UNPAID',
      period_start: startDate,
      period_end: endDate,
      load_count: finalLoadIds.length,
      gross_amount: grossAmount,
      driver_pay: driverPay,
      bonus_amount: bonusAmount,
      reimbursements_amount: reimbursementsAmount,
      accessorial_amount: accessorialAmount,
      deductions_amount: deductionsAmount,
      net_amount: netAmount,
      load_ids: finalLoadIds,
      compensation_snapshot: reconciliation.compensation_snapshot,
      recurring_deductions_snapshot: recurringDeductionsSnapshot,
      notes: `Generated by ${userId}`,
      }, trx);

      await notificationService.notifyAssignedDriver(companyId, driverId, {
        type: 'SETTLEMENT_GENERATED',
        title: 'Settlement available',
        message: `A settlement for ${startDate} to ${endDate} is available to review.`,
        relatedEntityType: 'SETTLEMENT',
        relatedEntityId: created.id,
        priority: 'HIGH',
      }, trx);

      return created;
    });

    return {
      ...settlement,
      gross_amount: Number(settlement.gross_amount || 0),
      driver_pay: Number(settlement.driver_pay || 0),
      bonus_amount: Number(settlement.bonus_amount || 0),
      reimbursements_amount: Number(settlement.reimbursements_amount || 0),
      accessorial_amount: Number(settlement.accessorial_amount || 0),
      deductions_amount: Number(settlement.deductions_amount || 0) + recurringDeductionsAmount,
      recurring_deductions_amount: recurringDeductionsAmount,
      recurring_deductions_snapshot: recurringDeductionsSnapshot,
      net_amount: Number(settlement.net_amount || 0),
      load_ids: Array.isArray(settlement.load_ids) ? settlement.load_ids : JSON.parse(settlement.load_ids || '[]'),
    };
  }
}

export const settlementService = new SettlementService();
