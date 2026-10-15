export async function up(knex) {
    await knex.schema.createTable('document_extractions', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE');
        table.string('field_name').notNullable();
        table.text('extracted_value');
        table.decimal('confidence', 5, 2);
        table.text('verified_value');
        table.uuid('verified_by').references('id').inTable('users');
        table.timestamp('verified_at');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.index(['document_id']);
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('document_extractions');
}
