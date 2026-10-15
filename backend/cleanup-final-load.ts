import database from './src/config/database';

const db = database;

async function deleteFinalLoad() {
  try {
    console.log('\n════════════════════════════════════════════════════════════════════════════════');
    console.log('🗑️  FINAL LOAD CLEANUP - Removing Remaining Load');
    console.log('════════════════════════════════════════════════════════════════════════════════\n');

    // Get the remaining load
    const remainingLoad = await db('loads')
      .where('company_id', '1d5dd91b-37d5-4421-a6bc-aff43f4ebf0f')
      .select('id', 'load_number')
      .first();

    if (!remainingLoad) {
      console.log('✅ No loads remaining in database\n');
      await db.destroy();
      process.exit(0);
    }

    console.log(`🗑️  Deleting: ${remainingLoad.load_number}\n`);

    const loadId = remainingLoad.id;

    // Delete load status history
    const deletedHistory = await db('load_status_history')
      .where('load_id', loadId)
      .del();
    console.log(`   ✅ Deleted ${deletedHistory} load status history records`);

    // Delete invoices
    const deletedInvoices = await db('invoices')
      .where('load_id', loadId)
      .del();
    console.log(`   ✅ Deleted ${deletedInvoices} invoices`);

    // Delete documents
    const deletedDocs = await db('documents')
      .where('load_id', loadId)
      .del();
    console.log(`   ✅ Deleted ${deletedDocs} documents`);

    // Delete load assignments
    const deletedAssignments = await db('load_assignments')
      .where('load_id', loadId)
      .del();
    console.log(`   ✅ Deleted ${deletedAssignments} load assignments`);

    // Delete load stops
    const deletedStops = await db('load_stops')
      .where('load_id', loadId)
      .del();
    console.log(`   ✅ Deleted ${deletedStops} load stops`);

    // Delete the load
    const deletedCount = await db('loads')
      .where('id', loadId)
      .del();
    console.log(`   ✅ Deleted ${deletedCount} load\n`);

    // Verify
    const remaining = await db('loads')
      .count('*')
      .first()
      .then((r: any) => parseInt(r.count));

    console.log('🔍 VERIFICATION:\n');
    console.log(`   Total loads remaining: ${remaining}`);

    if (remaining === 0) {
      console.log('\n✅ Database is now completely clean - 0 loads\n');
    }

    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log('✅ FINAL CLEANUP COMPLETE\n');

    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    await db.destroy();
    process.exit(1);
  }
}

deleteFinalLoad();
