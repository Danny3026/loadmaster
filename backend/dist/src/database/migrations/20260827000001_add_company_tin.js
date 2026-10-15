export async function up(knex) {
    const hasColumn = await knex.schema.hasColumn('companies', 'tin');
    if (!hasColumn) {
        await knex.schema.alterTable('companies', (table) => {
            table.string('tin', 32);
        });
    }
}
export async function down(knex) {
    const hasColumn = await knex.schema.hasColumn('companies', 'tin');
    if (hasColumn) {
        await knex.schema.alterTable('companies', (table) => {
            table.dropColumn('tin');
        });
    }
}
