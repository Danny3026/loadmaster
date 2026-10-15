export async function up(knex) {
    await knex.schema.alterTable('settlements', (table) => {
        table.uuid('submitted_by').nullable().references('id').inTable('users').onDelete('SET NULL');
        table.timestamp('submitted_at').nullable();
        table.uuid('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
        table.timestamp('approved_at').nullable();
        table.index(['status', 'company_id']);
    });
}
export async function down(knex) {
    await knex.schema.alterTable('settlements', (table) => {
        table.dropIndex(['status', 'company_id']);
        table.dropColumn('approved_at');
        table.dropColumn('approved_by');
        table.dropColumn('submitted_at');
        table.dropColumn('submitted_by');
    });
}
