import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasNetAmount = await knex.schema.hasColumn('settlements', 'net_amount');
  if (!hasNetAmount) {
    await knex.schema.alterTable('settlements', (table) => {
      table.decimal('net_amount', 12, 2).defaultTo(0);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasNetAmount = await knex.schema.hasColumn('settlements', 'net_amount');
  if (hasNetAmount) {
    await knex.schema.alterTable('settlements', (table) => {
      table.dropColumn('net_amount');
    });
  }
}