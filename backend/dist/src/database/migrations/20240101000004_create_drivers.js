export async function up(knex) {
    await knex.schema.createTable('drivers', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
        table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
        table.string('first_name').notNullable();
        table.string('last_name').notNullable();
        table.string('email');
        table.string('phone');
        table.string('license_number');
        table.string('license_state');
        table.date('license_expiry');
        table.string('status').defaultTo('ACTIVE');
        table.text('notes');
        table.timestamps(true, true);
        table.index(['company_id']);
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('drivers');
}
