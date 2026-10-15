import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasColumn('invoices', 'accessorials');
  if (!exists) {
    await knex.schema.alterTable('invoices', (table) => {
      table.jsonb('accessorials').notNullable().defaultTo('[]');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('invoices', (table) => {
    table.dropColumn('accessorials');
  });
}
