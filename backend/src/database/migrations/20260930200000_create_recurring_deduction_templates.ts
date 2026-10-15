import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('recurring_deduction_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.uuid('driver_id').nullable();
    table.text('description').notNullable();
    table.decimal('amount', 12, 2).notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    table.foreign(['company_id', 'driver_id'])
      .references(['company_id', 'id'])
      .inTable('drivers')
      .onDelete('CASCADE');
    table.index(['company_id', 'is_active']);
    table.index(['company_id', 'driver_id']);
  });

  await knex.schema.alterTable('settlements', (table) => {
    table.jsonb('recurring_deductions_snapshot').notNullable().defaultTo('[]');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('settlements', (table) => {
    table.dropColumn('recurring_deductions_snapshot');
  });
  await knex.schema.dropTableIfExists('recurring_deduction_templates');
}
