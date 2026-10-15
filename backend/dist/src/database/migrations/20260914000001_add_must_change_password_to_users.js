export async function up(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.boolean('must_change_password').notNullable().defaultTo(false);
    });
}
export async function down(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('must_change_password');
    });
}
