import db from '../config/database';
import { Knex } from 'knex';

type SettlementExecutor = Knex | Knex.Transaction;

export class SettlementRepository {
  private normalize(row: any) {
    return {
      ...row,
      gross_amount: Number(row.gross_amount || 0),
      driver_pay: Number(row.driver_pay || 0),
      amount_paid: row.amount_paid === null || row.amount_paid === undefined ? null : Number(row.amount_paid),
      load_ids: Array.isArray(row.load_ids) ? row.load_ids : JSON.parse(row.load_ids || '[]'),
    };
  }

  async findAll(companyId: string, filters: any = {}) {
    const query = db('settlements').where({ company_id: companyId });

    if (filters.driver_id) query.where('driver_id', filters.driver_id);
    if (filters.status) query.where('status', filters.status);
    if (filters.search) {
      query.whereRaw('LOWER(driver_name) LIKE ?', [`%${String(filters.search).toLowerCase()}%`]);
    }

    const rows = await query.orderBy('created_at', 'desc');
    return rows.map((row: any) => this.normalize(row));
  }

  async findById(companyId: string, id: string) {
    const row = await db('settlements').where({ company_id: companyId, id }).first();
    return row ? this.normalize(row) : null;
  }

  async findByDriverId(companyId: string, driverId: string, id?: string) {
    const query = db('settlements').where({ company_id: companyId, driver_id: driverId });
    if (id) query.where('id', id);
    const rows = await query.orderBy('created_at', 'desc');
    return rows.map((row: any) => this.normalize(row));
  }

  async updateStatus(companyId: string, id: string, data: any, executor: SettlementExecutor = db) {
    const [row] = await executor('settlements')
      .where({ company_id: companyId, id })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return row ? this.normalize(row) : null;
  }

  async markPaid(companyId: string, id: string, data: any, executor: SettlementExecutor = db) {
    const [row] = await executor('settlements')
      .where({ company_id: companyId, id, status: 'APPROVED' })
      .update({ ...data, status: 'PAID', updated_at: new Date() })
      .returning('*');
    return row ? this.normalize(row) : null;
  }

  async create(companyId: string, payload: any, executor: SettlementExecutor = db) {
    const [settlement] = await executor('settlements')
      .insert({
        company_id: companyId,
        driver_id: payload.driver_id,
        driver_name: payload.driver_name,
        status: payload.status || 'UNPAID',
        period_start: payload.period_start,
        period_end: payload.period_end,
        load_count: payload.load_count,
        gross_amount: payload.gross_amount,
        driver_pay: payload.driver_pay,
        bonus_amount: payload.bonus_amount || 0,
        reimbursements_amount: payload.reimbursements_amount || 0,
        accessorial_amount: payload.accessorial_amount || 0,
        deductions_amount: payload.deductions_amount || 0,
        net_amount: payload.net_amount || payload.driver_pay || 0,
        load_ids: JSON.stringify(payload.load_ids || []),
        compensation_snapshot: payload.compensation_snapshot == null
          ? null
          : JSON.stringify(payload.compensation_snapshot),
        recurring_deductions_snapshot: JSON.stringify(payload.recurring_deductions_snapshot || []),
        notes: payload.notes || null,
      })
      .returning('*');

    return {
      ...settlement,
      gross_amount: Number(settlement.gross_amount || 0),
      driver_pay: Number(settlement.driver_pay || 0),
      bonus_amount: Number(settlement.bonus_amount || 0),
      reimbursements_amount: Number(settlement.reimbursements_amount || 0),
      accessorial_amount: Number(settlement.accessorial_amount || 0),
      deductions_amount: Number(settlement.deductions_amount || 0),
      net_amount: Number(settlement.net_amount || 0),
      load_ids: Array.isArray(settlement.load_ids) ? settlement.load_ids : JSON.parse(settlement.load_ids || '[]'),
    };
  }
}

export const settlementRepository = new SettlementRepository();
