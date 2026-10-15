import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('activity_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.string('entity_type').notNullable();
    table.uuid('entity_id').notNullable();
    table.string('action').notNullable();
    table.jsonb('details');
    table.string('ip_address');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['company_id']);
    table.index(['entity_type', 'entity_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('activity_logs');
}
