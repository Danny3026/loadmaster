export async function up(knex) {
    await knex.schema.alterTable('drivers', (table) => {
        table.uuid('company_id').nullable().alter();
    });
}
export async function down(knex) {
    await knex.schema.alterTable('drivers', (table) => {
        table.uuid('company_id').notNullable().alter();
    });
}
