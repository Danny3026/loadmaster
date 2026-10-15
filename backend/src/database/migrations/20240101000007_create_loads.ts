import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('loads', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.uuid('broker_id').notNullable().references('id').inTable('brokers');
    table.string('load_number').notNullable();
    table.string('broker_reference');
    table.string('status').defaultTo('pending').notNullable();
    table.string('commodity');
    table.decimal('weight', 10, 2);
    table.string('weight_unit').defaultTo('LBS');
    table.decimal('rate', 10, 2);
    table.string('currency').defaultTo('USD');
    table.string('equipment_type');
    table.text('special_instructions');
    table.uuid('created_by').notNullable().references('id').inTable('users');
    table.timestamps(true, true);

    table.unique(['company_id', 'load_number']);
    table.index(['company_id']);
    table.index(['broker_id']);
    table.index(['status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('loads');
}
