import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('loads', (table) => {
    table.string('equipment_type_raw');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('loads', (table) => {
    table.dropColumn('equipment_type_raw');
  });
}