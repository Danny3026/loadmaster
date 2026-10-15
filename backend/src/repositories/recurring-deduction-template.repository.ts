import db from '../config/database';

export type RecurringDeductionTemplateInput = {
  driver_id: string | null;
  description: string;
  amount: number;
  is_active: boolean;
};

export class RecurringDeductionTemplateRepository {
  async findApplicable(companyId: string, driverId: string) {
    const rows = await db('recurring_deduction_templates')
      .where({ company_id: companyId, is_active: true })
      .where((query) => query.whereNull('driver_id').orWhere('driver_id', driverId))
      .orderBy('created_at', 'asc');

    return rows.map((row: any) => ({
      ...row,
      amount: Number(row.amount),
      is_active: Boolean(row.is_active),
    }));
  }

  async findAll(companyId: string) {
    const rows = await db('recurring_deduction_templates')
      .where({ company_id: companyId })
      .orderBy('created_at', 'desc');

    return rows.map((row: any) => ({
      ...row,
      amount: Number(row.amount),
      is_active: Boolean(row.is_active),
    }));
  }

  async findById(companyId: string, id: string) {
    const row = await db('recurring_deduction_templates')
      .where({ company_id: companyId, id })
      .first();
    return row ? { ...row, amount: Number(row.amount), is_active: Boolean(row.is_active) } : null;
  }

  async create(companyId: string, input: RecurringDeductionTemplateInput) {
    const [row] = await db('recurring_deduction_templates')
      .insert({ company_id: companyId, ...input })
      .returning('*');
    return { ...row, amount: Number(row.amount), is_active: Boolean(row.is_active) };
  }

  async update(companyId: string, id: string, input: Partial<RecurringDeductionTemplateInput>) {
    const [row] = await db('recurring_deduction_templates')
      .where({ company_id: companyId, id })
      .update({ ...input, updated_at: new Date() })
      .returning('*');
    return row ? { ...row, amount: Number(row.amount), is_active: Boolean(row.is_active) } : null;
  }

  async delete(companyId: string, id: string) {
    const deleted = await db('recurring_deduction_templates')
      .where({ company_id: companyId, id })
      .delete();
    return deleted > 0;
  }
}

export const recurringDeductionTemplateRepository = new RecurringDeductionTemplateRepository();
