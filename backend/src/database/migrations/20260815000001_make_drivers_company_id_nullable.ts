import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('drivers', (table) => {
    table.uuid('company_id').nullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('drivers', (table) => {
    table.uuid('company_id').notNullable().alter();
  });
}
