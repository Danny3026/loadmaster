export async function up(knex) {
    await knex.schema.createTable('invoices', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
        table.uuid('load_id').notNullable().references('id').inTable('loads').onDelete('CASCADE');
        table.uuid('broker_id').notNullable().references('id').inTable('brokers');
        table.uuid('driver_id').nullable().references('id').inTable('drivers');
        table.string('invoice_number').notNullable();
        table.enum('status', ['PENDING', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).defaultTo('PENDING');
        table.decimal('rate', 10, 2).notNullable();
        table.decimal('extras', 10, 2).defaultTo(0);
        table.decimal('total_amount', 10, 2).notNullable();
        table.string('currency').defaultTo('USD');
        table.date('invoice_date');
        table.date('date_factored').nullable();
        table.date('invoice_sent_date').nullable();
        table.date('payment_received_date').nullable();
        table.jsonb('accessorials').notNullable().defaultTo('[]');
        table.string('payment_status').defaultTo('UNPAID'); // PAID, UNPAID, PARTIAL
        table.text('notes').nullable();
        table.timestamps(true, true);
        table.unique(['company_id', 'invoice_number']);
        table.index(['company_id']);
        table.index(['load_id']);
        table.index(['broker_id']);
        table.index(['driver_id']);
        table.index(['status']);
        table.index(['payment_status']);
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('invoices');
}
