import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('brokers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('mc_number');
    table.string('contact_name');
    table.string('email');
    table.string('phone');
    table.string('address_line1');
    table.string('address_line2');
    table.string('city');
    table.string('state');
    table.string('zip_code');
    table.string('payment_terms');
    table.text('notes');
    table.string('status').defaultTo('ACTIVE');
    table.timestamps(true, true);

    table.index(['company_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('brokers');
}
