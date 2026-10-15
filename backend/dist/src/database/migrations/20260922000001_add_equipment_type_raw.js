export async function up(knex) {
    await knex.schema.alterTable('loads', (table) => {
        table.string('equipment_type_raw');
    });
}
export async function down(knex) {
    await knex.schema.alterTable('loads', (table) => {
        table.dropColumn('equipment_type_raw');
    });
}
