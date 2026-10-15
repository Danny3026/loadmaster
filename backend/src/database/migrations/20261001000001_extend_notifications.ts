import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('notifications', (table) => {
    table.timestamp('read_at').nullable();
    table.string('related_entity_type').nullable();
    table.uuid('related_entity_id').nullable();
    table.string('priority').notNullable().defaultTo('NORMAL');
    table.index(['user_id', 'created_at'], 'notifications_user_created_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('notifications', (table) => {
    table.dropIndex(['user_id', 'created_at'], 'notifications_user_created_idx');
    table.dropColumn('read_at');
    table.dropColumn('related_entity_type');
    table.dropColumn('related_entity_id');
    table.dropColumn('priority');
  });
}
