/**
 * Cleanup script to remove all mock/demo data from the database
 */
import db from '../config/database';
const DEMO_EMAILS = [
    'admin@example.com',
    'dispatcher@example.com',
    'john.smith@example.com',
    'mike.johnson@example.com',
    'sarah.williams@example.com',
    'admin@xyz.com',
];
const DEMO_LOAD_NUMBERS = [
    'L-1001',
    'L-1002',
    'LD-001',
    'LD-002',
    'LD-003',
];
const DEMO_BROKER_NAMES = [
    'ABC Logistics',
    'XYZ Freight',
    'Summit Transport',
];
const DEMO_COMPANY_NAMES = [
    'ABC Trucking LLC',
    'XYZ Transport Inc',
];
async function cleanupDemoData() {
    console.log('🧹 Starting demo data cleanup...\n');
    try {
        // First, get all demo users to find related records
        const demoUsers = await db('users').whereIn('email', DEMO_EMAILS).select('id');
        const demoUserIds = demoUsers.map((u) => u.id);
        console.log(`Found ${demoUserIds.length} demo users`);
        // Step 1: Get all demo loads (by load_number OR created by demo users)
        console.log('Finding demo loads...');
        let demoLoads = [];
        if (demoUserIds.length > 0) {
            demoLoads = await db('loads')
                .where(function (q) {
                q.whereIn('load_number', DEMO_LOAD_NUMBERS)
                    .orWhereIn('created_by', demoUserIds);
            })
                .select('id');
        }
        else {
            demoLoads = await db('loads').whereIn('load_number', DEMO_LOAD_NUMBERS).select('id');
        }
        const demoLoadIds = demoLoads.map((l) => l.id);
        console.log(`Found ${demoLoadIds.length} demo loads\n`);
        // Step 2: Remove document extractions (FK to documents)
        console.log('Removing document extractions...');
        if (demoLoadIds.length > 0) {
            const demoDocuments = await db('documents').whereIn('load_id', demoLoadIds).select('id');
            const demoDocumentIds = demoDocuments.map((d) => d.id);
            if (demoDocumentIds.length > 0) {
                await db('document_extractions').whereIn('document_id', demoDocumentIds).del();
            }
        }
        console.log('✓ Document extractions removed\n');
        // Step 3: Remove documents
        console.log('Removing documents...');
        if (demoLoadIds.length > 0) {
            await db('documents').whereIn('load_id', demoLoadIds).del();
        }
        console.log('✓ Documents removed\n');
        // Step 4: Remove notifications
        console.log('Removing notifications...');
        await db('notifications').del();
        console.log('✓ Notifications removed\n');
        // Step 5: Remove load status history
        console.log('Removing load status history...');
        if (demoLoadIds.length > 0) {
            await db('load_status_history').whereIn('load_id', demoLoadIds).del();
        }
        console.log('✓ Load status history removed\n');
        // Step 6: Remove load assignments
        console.log('Removing load assignments...');
        if (demoLoadIds.length > 0) {
            await db('load_assignments').whereIn('load_id', demoLoadIds).del();
        }
        console.log('✓ Load assignments removed\n');
        // Step 7: Remove load stops
        console.log('Removing load stops...');
        if (demoLoadIds.length > 0) {
            await db('load_stops').whereIn('load_id', demoLoadIds).del();
        }
        console.log('✓ Load stops removed\n');
        // Step 8: Remove invoices
        console.log('Removing invoices...');
        if (demoLoadIds.length > 0) {
            await db('invoices').whereIn('load_id', demoLoadIds).del();
        }
        console.log('✓ Invoices removed\n');
        // Step 9: Remove settlements for demo drivers
        console.log('Removing settlements...');
        const demoDrivers = await db('drivers')
            .where(function (q) {
            if (demoUserIds.length > 0) {
                q.whereIn('user_id', demoUserIds);
            }
        })
            .select('id');
        const demoDriverIds = demoDrivers.map((d) => d.id);
        if (demoDriverIds.length > 0) {
            await db('settlements').whereIn('driver_id', demoDriverIds).del();
        }
        console.log('✓ Settlements removed\n');
        // Step 10: Remove activity logs
        console.log('Removing activity logs...');
        await db('activity_logs').del();
        console.log('✓ Activity logs removed\n');
        // Step 11: Remove demo loads
        console.log('Removing loads...');
        if (demoLoadIds.length > 0) {
            await db('loads').whereIn('id', demoLoadIds).del();
        }
        console.log('✓ Loads removed\n');
        // Step 12: Remove demo brokers
        console.log('Removing brokers...');
        await db('brokers').whereIn('name', DEMO_BROKER_NAMES).del();
        console.log('✓ Brokers removed\n');
        // Step 13: Remove demo trucks
        console.log('Removing trucks...');
        const demoCompanies = await db('companies').whereIn('name', DEMO_COMPANY_NAMES).select('id');
        const demoCompanyIds = demoCompanies.map((c) => c.id);
        if (demoCompanyIds.length > 0) {
            await db('trucks').whereIn('company_id', demoCompanyIds).del();
        }
        console.log('✓ Trucks removed\n');
        // Step 14: Remove demo drivers
        console.log('Removing drivers...');
        if (demoUserIds.length > 0) {
            await db('drivers').whereIn('user_id', demoUserIds).del();
        }
        console.log('✓ Drivers removed\n');
        // Step 15: Remove demo users
        console.log('Removing users...');
        if (demoUserIds.length > 0) {
            await db('users').whereIn('id', demoUserIds).del();
        }
        console.log('✓ Users removed\n');
        // Step 16: Remove demo companies
        console.log('Removing companies...');
        if (demoCompanyIds.length > 0) {
            await db('companies').whereIn('id', demoCompanyIds).del();
        }
        console.log('✓ Companies removed\n');
        console.log('✅ Demo data cleanup complete!\n');
        console.log('The database is now clean and ready for real data.\n');
        console.log('Next steps:');
        console.log('1. Create a real company');
        console.log('2. Create a real admin user');
        console.log('3. Start using the system with real data\n');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}
cleanupDemoData();
