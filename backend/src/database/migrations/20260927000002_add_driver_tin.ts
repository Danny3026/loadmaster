import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('drivers', 'tin');
  if (!hasColumn) {
    await knex.schema.alterTable('drivers', (table) => {
      table.string('tin', 32).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('drivers', 'tin');
  if (!hasColumn) return;

  const rows = await knex('drivers').whereNotNull('tin').count<{ count: string }[]>({ count: 'id' });
  if (Number(rows[0]?.count || 0) > 0) {
    throw new Error('Cannot roll back the driver TIN column while it contains saved tax identifiers.');
  }

  await knex.schema.alterTable('drivers', (table) => {
    table.dropColumn('tin');
  });
}
