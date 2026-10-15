export async function up(knex) {
    await knex.schema.alterTable('drivers', (table) => {
        table.uuid('truck_id').nullable().references('id').inTable('trucks').onDelete('SET NULL');
        table.string('trailer_number').nullable();
        table.string('current_city').nullable();
        table.string('current_state').nullable();
        table.string('default_compensation_type').notNullable().defaultTo('PER_MILE');
        table.decimal('default_compensation_rate', 10, 4).nullable();
        table.index(['truck_id']);
    });
    await knex.schema.createTable('driver_compensation_rates', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('driver_id').notNullable().references('id').inTable('drivers').onDelete('CASCADE');
        table.string('load_type').notNullable();
        table.string('pay_type').notNullable();
        table.decimal('rate', 10, 4).nullable();
        table.timestamps(true, true);
        table.unique(['driver_id', 'load_type']);
        table.index(['driver_id']);
    });
    await knex.schema.alterTable('settlements', (table) => {
        table.jsonb('compensation_snapshot').nullable();
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('driver_compensation_rates');
    await knex.schema.alterTable('settlements', (table) => {
        table.dropColumn('compensation_snapshot');
    });
    await knex.schema.alterTable('drivers', (table) => {
        table.dropColumn('truck_id');
        table.dropColumn('trailer_number');
        table.dropColumn('current_city');
        table.dropColumn('current_state');
        table.dropColumn('default_compensation_type');
        table.dropColumn('default_compensation_rate');
    });
}
