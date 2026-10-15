import db from '../config/database';
/**
 * Remove all application data while preserving the schema, roles, and migrations.
 * Run with: npx tsx src/scripts/cleanup-demo-data.ts
 */
async function cleanupData() {
    const trx = await db.transaction();
    try {
        await trx('document_extractions').del();
        await trx('documents').del();
        await trx('load_status_history').del();
        await trx('load_assignments').del();
        await trx('load_stops').del();
        await trx('invoices').del();
        await trx('settlements').del();
        await trx('notifications').del();
        await trx('activity_logs').del();
        await trx('loads').del();
        await trx('trucks').del();
        await trx('drivers').del();
        await trx('brokers').del();
        await trx('users').del();
        await trx('companies').del();
        await trx.commit();
        console.log('Application data cleanup complete. Roles and schema were preserved.');
    }
    catch (error) {
        await trx.rollback();
        console.error('Application data cleanup failed:', error);
        process.exitCode = 1;
    }
    finally {
        await db.destroy();
    }
}
void cleanupData();
