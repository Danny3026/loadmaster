export async function up(knex) {
    await knex.schema.alterTable('loads', (table) => {
        table.decimal('loaded_miles', 10, 2).defaultTo(0);
        table.decimal('deadhead_miles', 10, 2).defaultTo(0);
    });
}
export async function down(knex) {
    await knex.schema.alterTable('loads', (table) => {
        table.dropColumn('loaded_miles');
        table.dropColumn('deadhead_miles');
    });
}
