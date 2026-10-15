export async function up(knex) {
    await knex.schema.createTable('trucks', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
        table.string('unit_number').notNullable();
        table.string('vin');
        table.string('make');
        table.string('model');
        table.integer('year');
        table.enum('type', ['DRY_VAN', 'FLATBED', 'REEFER', 'STEP_DECK', 'OTHER']).notNullable();
        table.string('license_plate');
        table.string('license_state');
        table.string('status').defaultTo('ACTIVE');
        table.text('notes');
        table.timestamps(true, true);
        table.unique(['company_id', 'unit_number']);
        table.index(['company_id']);
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('trucks');
}
