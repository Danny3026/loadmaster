import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tax_preparations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.uuid('driver_id').nullable().references('id').inTable('drivers').onDelete('SET NULL');
    table.string('subject_key', 80).notNullable();
    table.integer('tax_year').notNullable();
    table.integer('version').notNullable();
    table.string('status', 24).notNullable().defaultTo('PREPARED');
    table.text('encrypted_data').notNullable();
    table.timestamps(true, true);

    table.unique(['company_id', 'subject_key', 'tax_year', 'version']);
    table.index(['company_id', 'tax_year', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('tax_preparations'))) return;

  const rows = await knex('tax_preparations').count<{ count: string }[]>({ count: 'id' });
  if (Number(rows[0]?.count || 0) > 0) {
    throw new Error('Cannot roll back tax preparation history while prepared records exist.');
  }

  await knex.schema.dropTable('tax_preparations');
}
