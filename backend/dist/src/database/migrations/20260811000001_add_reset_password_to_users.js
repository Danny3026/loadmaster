export async function up(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.string('reset_password_token').nullable();
        table.timestamp('reset_password_expires').nullable();
    });
}
export async function down(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('reset_password_token');
        table.dropColumn('reset_password_expires');
    });
}
