const cdlColumns = [
    'cdl_class',
    'cdl_endorsements',
    'cdl_restrictions',
    'cdl_issue_date',
    'date_of_birth',
    'medical_card_expiry',
    'clearinghouse_renewal_date',
];
export async function up(knex) {
    const existingColumns = await Promise.all(cdlColumns.map((column) => knex.schema.hasColumn('drivers', column)));
    const missingColumns = cdlColumns.filter((_, index) => !existingColumns[index]);
    if (missingColumns.length) {
        await knex.schema.alterTable('drivers', (table) => {
            for (const column of missingColumns) {
                if (column.endsWith('_date') || column === 'medical_card_expiry')
                    table.date(column).nullable();
                else
                    table.string(column, 255).nullable();
            }
        });
    }
}
export async function down(knex) {
    const existingColumns = await Promise.all(cdlColumns.map((column) => knex.schema.hasColumn('drivers', column)));
    const columnsToDrop = cdlColumns.filter((_, index) => existingColumns[index]);
    if (columnsToDrop.length) {
        await knex.schema.alterTable('drivers', (table) => {
            for (const column of columnsToDrop)
                table.dropColumn(column);
        });
    }
}
