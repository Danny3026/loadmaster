import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('documents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
    table.uuid('load_id').notNullable().references('id').inTable('loads').onDelete('CASCADE');
    table.uuid('uploaded_by').notNullable().references('id').inTable('users');
    table.enum('document_type', [
      'RATE_CONFIRMATION', 'BOL', 'POD', 'LUMPER_RECEIPT', 'DELIVERY_RECEIPT', 'OTHER'
    ]).notNullable();
    table.string('original_filename').notNullable();
    table.string('storage_key').notNullable();
    table.string('mime_type').notNullable();
    table.integer('file_size').notNullable();
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['company_id']);
    table.index(['load_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('documents');
}
