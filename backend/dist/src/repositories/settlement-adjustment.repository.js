import db from '../config/database';
export class SettlementAdjustmentRepository {
    async findBySettlement(companyId, settlementId) {
        return db('settlement_adjustments')
            .where({ company_id: companyId, settlement_id: settlementId })
            .orderBy('created_at', 'asc');
    }
    async create(companyId, input) {
        const [adjustment] = await db('settlement_adjustments')
            .insert({
            company_id: companyId,
            settlement_id: input.settlement_id,
            driver_id: input.driver_id,
            load_id: input.load_id || null,
            category: input.category,
            type: input.type,
            description: input.description || null,
            amount: input.amount,
            created_by: input.created_by || null,
        })
            .returning('*');
        return adjustment;
    }
    async summarizeBySettlement(companyId, settlementId) {
        const rows = await this.findBySettlement(companyId, settlementId);
        return rows.reduce((summary, row) => {
            const amount = Number(row.amount || 0);
            if (String(row.category).toUpperCase() === 'DEDUCTION') {
                summary.deductions += amount;
            }
            else if (String(row.category).toUpperCase() === 'EARNING' || String(row.category).toUpperCase() === 'REIMBURSEMENT') {
                summary.earnings += amount;
            }
            return summary;
        }, { earnings: 0, deductions: 0 });
    }
}
export const settlementAdjustmentRepository = new SettlementAdjustmentRepository();
