import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable().unique();
    table.string('description');
    table.timestamps(true, true);
  });

  // Seed default roles immediately
  await knex('roles').insert([
    { name: 'ADMIN', description: 'Administrator with full access' },
    { name: 'DISPATCHER', description: 'Can manage loads and assignments' },
    { name: 'DRIVER', description: 'Limited access, can only view assigned loads and update status' },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('roles');
}
