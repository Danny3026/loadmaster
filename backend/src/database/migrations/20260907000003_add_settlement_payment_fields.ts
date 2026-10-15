import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('settlements', (table) => {
    table.timestamp('payment_date').nullable();
    table.uuid('paid_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.decimal('amount_paid', 12, 2).nullable();
    table.index(['payment_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('settlements', (table) => {
    table.dropIndex(['payment_date']);
    table.dropColumn('amount_paid');
    table.dropColumn('paid_by');
    table.dropColumn('payment_date');
  });
}