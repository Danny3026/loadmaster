import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
/**
 * DEMO DATA SEED FILE
 *
 * This seed file contains demo/test data for development purposes ONLY.
 *
 * ⚠️  IMPORTANT: This seed should NOT auto-run in production or when cleaning up.
 *
 * To run this seed manually (development only):
 *   npx knex seed:run --env development
 *
 * To remove demo data:
 *   npx tsx src/scripts/cleanup-demo-data.ts
 *
 * The application will NOT function correctly without at least one:
 * - Company
 * - User (admin)
 * - Role
 *
 * If you delete all data using the cleanup script, you MUST create these manually
 * before using the application again.
 */
export async function seed(knex) {
    if (process.env.ALLOW_DEMO_DATA !== 'true') {
        console.log('Demo seed disabled. Set ALLOW_DEMO_DATA=true to run it explicitly.');
        return;
    }
    // Check if data already exists
    const existingUsers = await knex('users').count('id').first();
    if (existingUsers && parseInt(existingUsers.count) > 0) {
        console.log('⏭️  Demo data already exists. Skipping seed.');
        return;
    }
    console.log('📊 Seeding demo data for development...');
    // Clear existing entries (only if empty)
    await knex('activity_logs').del();
    await knex('notifications').del();
    await knex('load_status_history').del();
    await knex('document_extractions').del();
    await knex('documents').del();
    await knex('load_assignments').del();
    await knex('load_stops').del();
    await knex('loads').del();
    await knex('brokers').del();
    await knex('trucks').del();
    await knex('drivers').del();
    await knex('invoices').del();
    await knex('settlements').del();
    await knex('users').del();
    await knex('roles').del();
    await knex('companies').del();
    // Insert roles
    const roles = [
        { id: uuidv4(), name: 'ADMIN', description: 'Administrator' },
        { id: uuidv4(), name: 'DISPATCHER', description: 'Dispatcher' },
        { id: uuidv4(), name: 'DRIVER', description: 'Driver' }
    ];
    await knex('roles').insert(roles);
    const getRole = (name) => roles.find(r => r.name === name).id;
    // Insert companies
    const comp1 = uuidv4();
    const comp2 = uuidv4();
    await knex('companies').insert([
        { id: comp1, name: 'ABC Trucking LLC', mc_number: 'MC123456', dot_number: 'DOT123456', email: 'info@abctrucking.com', status: 'ACTIVE' },
        { id: comp2, name: 'XYZ Transport Inc', mc_number: 'MC654321', dot_number: 'DOT654321', email: 'info@xyztransport.com', status: 'ACTIVE' }
    ]);
    // Passwords
    const hash = await argon2.hash('Password123!');
    // Users
    const abcAdmin = uuidv4();
    const abcDispatcher = uuidv4();
    const abcDriver1 = uuidv4();
    const abcDriver2 = uuidv4();
    const abcDriver3 = uuidv4();
    const xyzAdmin = uuidv4();
    await knex('users').insert([
        { id: abcAdmin, company_id: comp1, role_id: getRole('ADMIN'), email: 'admin@example.com', password_hash: hash, first_name: 'Admin', last_name: 'User' },
        { id: abcDispatcher, company_id: comp1, role_id: getRole('DISPATCHER'), email: 'dispatcher@example.com', password_hash: hash, first_name: 'Disp', last_name: 'User' },
        { id: abcDriver1, company_id: comp1, role_id: getRole('DRIVER'), email: 'john.smith@example.com', password_hash: hash, first_name: 'John', last_name: 'Smith' },
        { id: abcDriver2, company_id: comp1, role_id: getRole('DRIVER'), email: 'mike.johnson@example.com', password_hash: hash, first_name: 'Mike', last_name: 'Johnson' },
        { id: abcDriver3, company_id: comp1, role_id: getRole('DRIVER'), email: 'sarah.williams@example.com', password_hash: hash, first_name: 'Sarah', last_name: 'Williams' },
        { id: xyzAdmin, company_id: comp2, role_id: getRole('ADMIN'), email: 'admin@xyz.com', password_hash: hash, first_name: 'XYZ', last_name: 'Admin' }
    ]);
    // Drivers
    const driver1Id = uuidv4();
    await knex('drivers').insert([
        { id: driver1Id, company_id: comp1, user_id: abcDriver1, first_name: 'John', last_name: 'Smith', email: 'john.smith@example.com', status: 'ACTIVE' },
        { id: uuidv4(), company_id: comp1, user_id: abcDriver2, first_name: 'Mike', last_name: 'Johnson', email: 'mike.johnson@example.com', status: 'ACTIVE' },
        { id: uuidv4(), company_id: comp1, user_id: abcDriver3, first_name: 'Sarah', last_name: 'Williams', email: 'sarah.williams@example.com', status: 'ACTIVE' }
    ]);
    // Trucks
    const truck1Id = uuidv4();
    await knex('trucks').insert([
        { id: truck1Id, company_id: comp1, unit_number: '101', make: 'Freightliner', model: 'Cascadia', year: 2021, type: 'DRY_VAN' },
        { id: uuidv4(), company_id: comp1, unit_number: '102', make: 'Kenworth', model: 'T680', year: 2022, type: 'FLATBED' },
        { id: uuidv4(), company_id: comp1, unit_number: '103', make: 'Peterbilt', model: '579', year: 2023, type: 'REEFER' }
    ]);
    // Brokers
    const broker1 = uuidv4();
    await knex('brokers').insert([
        { id: broker1, company_id: comp1, name: 'ABC Logistics', contact_name: 'Bob', email: 'bob@abc.com' },
        { id: uuidv4(), company_id: comp1, name: 'XYZ Freight', contact_name: 'Alice', email: 'alice@xyz.com' },
        { id: uuidv4(), company_id: comp1, name: 'Summit Transport', contact_name: 'Tom', email: 'tom@summit.com' }
    ]);
    // Loads
    const load1 = uuidv4();
    await knex('loads').insert([
        { id: load1, company_id: comp1, broker_id: broker1, load_number: 'L-1001', status: 'pending', commodity: 'Electronics', weight: 40000, rate: 2500, created_by: abcAdmin, loaded_miles: 500, deadhead_miles: 50 },
        { id: uuidv4(), company_id: comp1, broker_id: broker1, load_number: 'L-1002', status: 'delivered', commodity: 'Paper', weight: 42000, rate: 1800, created_by: abcDispatcher, loaded_miles: 450, deadhead_miles: 100 }
    ]);
    // Load Stops
    await knex('load_stops').insert([
        { id: uuidv4(), load_id: load1, stop_sequence: 1, stop_type: 'PICKUP', facility_name: 'Origin Warehouse', city: 'Chicago', state: 'IL' },
        { id: uuidv4(), load_id: load1, stop_sequence: 2, stop_type: 'DELIVERY', facility_name: 'Dest Warehouse', city: 'Dallas', state: 'TX' }
    ]);
    // Load Assignments
    await knex('load_assignments').insert([
        { id: uuidv4(), load_id: load1, driver_id: driver1Id, truck_id: truck1Id, assigned_by: abcDispatcher, is_active: true }
    ]);
    console.log('✓ Demo data seeded successfully');
}
