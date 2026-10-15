const settlementAmountFields = [
    'bonus_amount',
    'reimbursements_amount',
    'accessorial_amount',
    'deductions_amount',
];
export async function up(knex) {
    for (const field of settlementAmountFields) {
        if (!(await knex.schema.hasColumn('settlements', field))) {
            await knex.schema.alterTable('settlements', (table) => {
                table.decimal(field, 12, 2).notNullable().defaultTo(0);
            });
        }
    }
}
export async function down(knex) {
    for (const field of settlementAmountFields) {
        if (await knex.schema.hasColumn('settlements', field)) {
            await knex.schema.alterTable('settlements', (table) => {
                table.dropColumn(field);
            });
        }
    }
}
