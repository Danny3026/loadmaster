export async function up(knex) {
    await knex.schema.createTable('settlements', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE');
        table.uuid('driver_id').notNullable().references('id').inTable('drivers').onDelete('CASCADE');
        table.string('driver_name').notNullable();
        table.string('status').defaultTo('UNPAID');
        table.date('period_start').notNullable();
        table.date('period_end').notNullable();
        table.integer('load_count').defaultTo(0);
        table.decimal('gross_amount', 12, 2).defaultTo(0);
        table.decimal('driver_pay', 12, 2).defaultTo(0);
        table.decimal('bonus_amount', 12, 2).defaultTo(0);
        table.decimal('reimbursements_amount', 12, 2).defaultTo(0);
        table.decimal('accessorial_amount', 12, 2).defaultTo(0);
        table.decimal('deductions_amount', 12, 2).defaultTo(0);
        table.decimal('net_amount', 12, 2).defaultTo(0);
        table.jsonb('load_ids').defaultTo('[]');
        table.text('notes').nullable();
        table.timestamps(true, true);
        table.index(['company_id']);
        table.index(['driver_id']);
        table.index(['status']);
        table.index(['period_start', 'period_end']);
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('settlements');
}
