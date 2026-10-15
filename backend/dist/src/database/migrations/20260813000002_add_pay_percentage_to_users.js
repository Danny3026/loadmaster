export async function up(knex) {
    await knex.schema.table('users', (table) => {
        table.decimal('pay_percentage', 5, 2).nullable();
    });
}
export async function down(knex) {
    await knex.schema.table('users', (table) => {
        table.dropColumn('pay_percentage');
    });
}
