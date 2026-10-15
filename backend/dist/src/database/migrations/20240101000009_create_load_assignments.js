export async function up(knex) {
    await knex.schema.createTable('load_assignments', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('load_id').notNullable().references('id').inTable('loads').onDelete('CASCADE');
        table.uuid('driver_id').notNullable().references('id').inTable('drivers');
        table.uuid('truck_id').notNullable().references('id').inTable('trucks');
        table.uuid('assigned_by').notNullable().references('id').inTable('users');
        table.timestamp('assigned_at').defaultTo(knex.fn.now());
        table.timestamp('unassigned_at');
        table.boolean('is_active').defaultTo(true);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.index(['load_id']);
        table.index(['driver_id']);
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('load_assignments');
}
