"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seed = seed;
const uuid_1 = require("uuid");
async function seed(knex) {
    // Only delete invoices to allow running this seed multiple times
    await knex('invoices').del();
    // Get sample data
    const companies = await knex('companies').limit(1);
    const loads = await knex('loads').limit(6);
    const brokers = await knex('brokers').limit(6);
    const drivers = await knex('drivers').limit(6);
    if (!companies.length) {
        console.log('⚠️  No companies found. Run 001_demo_data.ts first');
        return;
    }
    if (!loads.length) {
        console.log('⚠️  No loads found. Run 001_demo_data.ts first');
        return;
    }
    const companyId = companies[0].id;
    // Create mock invoices
    const invoices = [
        {
            id: (0, uuid_1.v4)(),
            company_id: companyId,
            load_id: loads[0]?.id || (0, uuid_1.v4)(),
            broker_id: brokers[0]?.id || (0, uuid_1.v4)(),
            driver_id: drivers[0]?.id || null,
            invoice_number: 'INV-2026-0001',
            status: 'PAID',
            rate: 2500.0,
            extras: 150.0,
            total_amount: 2650.0,
            currency: 'USD',
            payment_status: 'PAID',
            invoice_date: new Date('2026-08-10'),
            date_factored: new Date('2026-08-11'),
            invoice_sent_date: new Date('2026-08-11'),
            payment_received_date: new Date('2026-08-13'),
            notes: 'Delivered on time',
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            id: (0, uuid_1.v4)(),
            company_id: companyId,
            load_id: loads[1]?.id || (0, uuid_1.v4)(),
            broker_id: brokers[1]?.id || (0, uuid_1.v4)(),
            driver_id: drivers[1]?.id || null,
            invoice_number: 'INV-2026-0002',
            status: 'SENT',
            rate: 3200.0,
            extras: 200.0,
            total_amount: 3400.0,
            currency: 'USD',
            payment_status: 'UNPAID',
            invoice_date: new Date('2026-08-12'),
            date_factored: null,
            invoice_sent_date: new Date('2026-08-12'),
            payment_received_date: null,
            notes: 'Awaiting payment',
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            id: (0, uuid_1.v4)(),
            company_id: companyId,
            load_id: loads[2]?.id || (0, uuid_1.v4)(),
            broker_id: brokers[2]?.id || (0, uuid_1.v4)(),
            driver_id: drivers[2]?.id || null,
            invoice_number: 'INV-2026-0003',
            status: 'PENDING',
            rate: 1800.0,
            extras: 0.0,
            total_amount: 1800.0,
            currency: 'USD',
            payment_status: 'UNPAID',
            invoice_date: new Date('2026-08-13'),
            date_factored: null,
            invoice_sent_date: null,
            payment_received_date: null,
            notes: 'Not yet sent to broker',
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            id: (0, uuid_1.v4)(),
            company_id: companyId,
            load_id: loads[3]?.id || (0, uuid_1.v4)(),
            broker_id: brokers[3]?.id || (0, uuid_1.v4)(),
            driver_id: drivers[3]?.id || null,
            invoice_number: 'INV-2026-0004',
            status: 'SENT',
            rate: 2200.0,
            extras: 100.0,
            total_amount: 2300.0,
            currency: 'USD',
            payment_status: 'UNPAID',
            invoice_date: new Date('2026-08-08'),
            date_factored: new Date('2026-08-09'),
            invoice_sent_date: new Date('2026-08-09'),
            payment_received_date: null,
            notes: 'Factored - Pending payment',
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            id: (0, uuid_1.v4)(),
            company_id: companyId,
            load_id: loads[4]?.id || (0, uuid_1.v4)(),
            broker_id: brokers[4]?.id || (0, uuid_1.v4)(),
            driver_id: drivers[4]?.id || null,
            invoice_number: 'INV-2026-0005',
            status: 'PAID',
            rate: 4100.0,
            extras: 300.0,
            total_amount: 4400.0,
            currency: 'USD',
            payment_status: 'PAID',
            invoice_date: new Date('2026-08-07'),
            date_factored: new Date('2026-08-08'),
            invoice_sent_date: new Date('2026-08-08'),
            payment_received_date: new Date('2026-08-12'),
            notes: 'High-value load - Priority payment',
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            id: (0, uuid_1.v4)(),
            company_id: companyId,
            load_id: loads[5]?.id || loads[0]?.id || (0, uuid_1.v4)(),
            broker_id: brokers[5]?.id || brokers[1]?.id || (0, uuid_1.v4)(),
            driver_id: drivers[5]?.id || drivers[2]?.id || null,
            invoice_number: 'INV-2026-0006',
            status: 'OVERDUE',
            rate: 2000.0,
            extras: 50.0,
            total_amount: 2050.0,
            currency: 'USD',
            payment_status: 'UNPAID',
            invoice_date: new Date('2026-07-25'),
            date_factored: new Date('2026-07-26'),
            invoice_sent_date: new Date('2026-07-26'),
            payment_received_date: null,
            notes: 'Payment overdue - Follow up required',
            created_at: new Date(),
            updated_at: new Date(),
        },
    ];
    // Insert invoices
    await knex('invoices').insert(invoices);
    console.log(`✅ Seeded ${invoices.length} mock invoices`);
}
