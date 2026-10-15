import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const tableExists = await knex.schema.hasTable('driver_availability');
  if (tableExists) return;

  await knex.schema.createTable('driver_availability', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.uuid('driver_id').notNullable().references('id').inTable('drivers').onDelete('CASCADE');
    table.string('status').notNullable().defaultTo('UNAVAILABLE');
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.string('reason', 255).nullable();
    table.timestamps(true, true);
    table.index(['company_id', 'driver_id', 'start_date', 'end_date'], 'driver_availability_range_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('driver_availability');
}