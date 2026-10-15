import type { Knex } from 'knex';

const settlementAmountFields = [
  'bonus_amount',
  'reimbursements_amount',
  'accessorial_amount',
  'deductions_amount',
] as const;

export async function up(knex: Knex): Promise<void> {
  for (const field of settlementAmountFields) {
    if (!(await knex.schema.hasColumn('settlements', field))) {
      await knex.schema.alterTable('settlements', (table) => {
        table.decimal(field, 12, 2).notNullable().defaultTo(0);
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const field of settlementAmountFields) {
    if (await knex.schema.hasColumn('settlements', field)) {
      await knex.schema.alterTable('settlements', (table) => {
        table.dropColumn(field);
      });
    }
  }
}
