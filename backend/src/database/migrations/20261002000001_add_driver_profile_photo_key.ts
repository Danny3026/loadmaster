import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('drivers', (table) => {
    table.string('profile_photo_key').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('drivers', (table) => {
    table.dropColumn('profile_photo_key');
  });
}
