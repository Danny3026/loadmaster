export async function up(knex) {
    await knex.schema.createTable('load_stops', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('load_id').notNullable().references('id').inTable('loads').onDelete('CASCADE');
        table.integer('stop_sequence').notNullable();
        table.enum('stop_type', ['PICKUP', 'DELIVERY']).notNullable();
        table.string('facility_name').notNullable();
        table.string('address_line1');
        table.string('address_line2');
        table.string('city');
        table.string('state');
        table.string('zip_code');
        table.date('appointment_date');
        table.time('appointment_start');
        table.time('appointment_end');
        table.timestamp('actual_arrival');
        table.timestamp('actual_departure');
        table.string('contact_name');
        table.string('contact_phone');
        table.text('instructions');
        table.timestamps(true, true);
        table.index(['load_id']);
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('load_stops');
}
