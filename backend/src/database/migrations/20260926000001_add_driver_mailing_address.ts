import { Knex } from 'knex';

const mailingAddressColumns = ['mailing_address', 'mailing_city', 'mailing_state', 'mailing_zip'];

export async function up(knex: Knex): Promise<void> {
  const existingColumns = await Promise.all(
    mailingAddressColumns.map((column) => knex.schema.hasColumn('drivers', column))
  );
  const missingColumns = mailingAddressColumns.filter((_, index) => !existingColumns[index]);

  if (missingColumns.length) {
    await knex.schema.alterTable('drivers', (table) => {
      for (const column of missingColumns) table.string(column, 255).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const existingColumns = await Promise.all(
    mailingAddressColumns.map((column) => knex.schema.hasColumn('drivers', column))
  );
  const columnsToDrop = mailingAddressColumns.filter((_, index) => existingColumns[index]);

  if (columnsToDrop.length) {
    await knex.schema.alterTable('drivers', (table) => {
      for (const column of columnsToDrop) table.dropColumn(column);
    });
  }
}