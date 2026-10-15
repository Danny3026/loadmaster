export async function up(knex) {
    await knex.schema.alterTable('settlements', (table) => {
        table.unique(['company_id', 'id'], 'settlements_company_id_id_unique');
    });
    await knex.schema.alterTable('drivers', (table) => {
        table.unique(['company_id', 'id'], 'drivers_company_id_id_unique');
    });
    await knex.schema.alterTable('loads', (table) => {
        table.unique(['company_id', 'id'], 'loads_company_id_id_unique');
    });
    await knex.schema.createTable('settlement_adjustments', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
        table.uuid('settlement_id').notNullable();
        table.uuid('driver_id').notNullable();
        table.uuid('load_id').nullable();
        table.string('category', 32).notNullable();
        table.string('type', 64).notNullable();
        table.text('description').nullable();
        table.decimal('amount', 12, 2).notNullable();
        table.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
        table.timestamps(true, true);
        table.foreign(['company_id', 'settlement_id'])
            .references(['company_id', 'id'])
            .inTable('settlements')
            .onDelete('CASCADE');
        table.foreign(['company_id', 'driver_id'])
            .references(['company_id', 'id'])
            .inTable('drivers')
            .onDelete('CASCADE');
        table.foreign(['company_id', 'load_id'])
            .references(['company_id', 'id'])
            .inTable('loads')
            .onDelete('SET NULL');
        table.index(['company_id', 'settlement_id']);
        table.index(['company_id', 'driver_id']);
        table.index(['company_id', 'load_id']);
        table.index(['category', 'type']);
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('settlement_adjustments');
    await knex.schema.alterTable('drivers', (table) => {
        table.dropUnique(['company_id', 'id'], 'drivers_company_id_id_unique');
    });
    await knex.schema.alterTable('loads', (table) => {
        table.dropUnique(['company_id', 'id'], 'loads_company_id_id_unique');
    });
    await knex.schema.alterTable('settlements', (table) => {
        table.dropUnique(['company_id', 'id'], 'settlements_company_id_id_unique');
    });
}
