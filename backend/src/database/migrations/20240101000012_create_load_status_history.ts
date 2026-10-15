import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('load_status_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('load_id').notNullable().references('id').inTable('loads').onDelete('CASCADE');
    table.string('from_status').notNullable();
    table.string('to_status').notNullable();
    table.uuid('changed_by').notNullable().references('id').inTable('users');
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['load_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('load_status_history');
}
