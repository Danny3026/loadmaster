export async function up(knex) {
    const hasColumn = await knex.schema.hasColumn('companies', 'tin_encrypted');
    if (!hasColumn) {
        await knex.schema.alterTable('companies', (table) => {
            table.text('tin_encrypted');
        });
    }
}
export async function down(knex) {
    const hasColumn = await knex.schema.hasColumn('companies', 'tin_encrypted');
    if (hasColumn) {
        const encryptedRows = await knex('companies')
            .whereNotNull('tin_encrypted')
            .count({ count: 'id' });
        if (Number(encryptedRows[0]?.count || 0) > 0) {
            throw new Error('Cannot roll back encrypted payer EIN data without losing saved identifiers.');
        }
        await knex.schema.alterTable('companies', (table) => {
            table.dropColumn('tin_encrypted');
        });
    }
}
