export async function up(knex) {
    const exists = await knex.schema.hasColumn('invoices', 'accessorials');
    if (!exists) {
        await knex.schema.alterTable('invoices', (table) => {
            table.jsonb('accessorials').notNullable().defaultTo('[]');
        });
    }
}
export async function down(knex) {
    await knex.schema.alterTable('invoices', (table) => {
        table.dropColumn('accessorials');
    });
}
