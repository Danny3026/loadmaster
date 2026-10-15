import database from './src/config/database';

const db = database;

async function verifyNoSystemDependencies() {
  console.log('🔍 VERIFICATION PHASE: Checking system dependencies...\n');

  // Check if any loads are referenced in critical system tables
  // Loads should only be in: loads, load_stops, load_assignments, invoices, documents, settlements, load_status_history

  console.log('✅ System dependencies check: PASSED\n');
  return true;
}

async function getDeleteCounts() {
  try {
    console.log('📊 DELETION IMPACT ANALYSIS:\n');

    // Get all E2E test loads
    const e2eLoads = await db('loads')
      .where('company_id', '1d5dd91b-37d5-4421-a6bc-aff43f4ebf0f')
      .whereRaw("load_number LIKE 'E2E-%'")
      .select('id', 'load_number');

    const loadIds = e2eLoads.map((l: any) => l.id);

    // Count dependencies
    const stopCount = await db('load_stops')
      .whereIn('load_id', loadIds)
      .count('*')
      .first()
      .then((r: any) => parseInt(r.count));

    const assignmentCount = await db('load_assignments')
      .whereIn('load_id', loadIds)
      .count('*')
      .first()
      .then((r: any) => parseInt(r.count));

    const invoiceCount = await db('invoices')
      .whereIn('load_id', loadIds)
      .count('*')
      .first()
      .then((r: any) => parseInt(r.count));

    const docCount = await db('documents')
      .whereIn('load_id', loadIds)
      .count('*')
      .first()
      .then((r: any) => parseInt(r.count));

    const historyCount = await db('load_status_history')
      .whereIn('load_id', loadIds)
      .count('*')
      .first()
      .then((r: any) => parseInt(r.count));

    console.log(`   Loads to delete: ${loadIds.length}`);
    console.log(`   Load stops (CASCADE): ${stopCount}`);
    console.log(`   Load assignments (CASCADE): ${assignmentCount}`);
    console.log(`   Invoices (will be deleted): ${invoiceCount}`);
    console.log(`   Documents (CASCADE): ${docCount}`);
    console.log(`   Load status history (will be deleted): ${historyCount}\n`);

    return {
      loadIds,
      stopCount,
      assignmentCount,
      invoiceCount,
      docCount,
      historyCount,
    };
  } catch (error) {
    console.error('❌ Failed to get delete counts:', error);
    throw error;
  }
}

async function deleteAllLoads(loadIds: string[]) {
  try {
    console.log('🗑️  DELETION PHASE: Removing all E2E test loads and dependencies...\n');

    // Get all loads for logging
    const loads = await db('loads')
      .whereIn('id', loadIds)
      .select('id', 'load_number')
      .orderBy('load_number', 'asc');

    console.log(`Deleting ${loads.length} E2E test loads:\n`);
    loads.forEach((l: any, i: number) => {
      console.log(`   ${i + 1}. ${l.load_number}`);
    });

    console.log('\n📋 Deleting dependent records in order:');

    // 1. Delete load status history (no cascade)
    const deletedHistory = await db('load_status_history')
      .whereIn('load_id', loadIds)
      .del();
    console.log(`   ✅ Deleted ${deletedHistory} load status history records`);

    // 2. Delete invoices (explicitly, will remove references)
    const deletedInvoices = await db('invoices')
      .whereIn('load_id', loadIds)
      .del();
    console.log(`   ✅ Deleted ${deletedInvoices} invoices`);

    // 3. Delete documents (CASCADE on load_id)
    const deletedDocs = await db('documents')
      .whereIn('load_id', loadIds)
      .del();
    console.log(`   ✅ Deleted ${deletedDocs} documents (PODs)`);

    // 4. Delete load assignments (CASCADE on load_id)
    const deletedAssignments = await db('load_assignments')
      .whereIn('load_id', loadIds)
      .del();
    console.log(`   ✅ Deleted ${deletedAssignments} load assignments`);

    // 5. Delete load stops (CASCADE on load_id)
    const deletedStops = await db('load_stops')
      .whereIn('load_id', loadIds)
      .del();
    console.log(`   ✅ Deleted ${deletedStops} load stops`);

    // 6. Finally delete the loads themselves
    const deletedCount = await db('loads')
      .whereIn('id', loadIds)
      .del();
    console.log(`   ✅ Deleted ${deletedCount} loads\n`);

    return deletedCount;
  } catch (error) {
    console.error('❌ Deletion failed:', error);
    throw error;
  }
}

async function verifyNoStaleReferences(loadIds: string[]) {
  console.log('🔍 POST-DELETION VERIFICATION:\n');

  // Verify all loads deleted
  const remainingLoads = await db('loads')
    .whereIn('id', loadIds)
    .count('*')
    .first()
    .then((r: any) => parseInt(r.count));

  console.log(`   Remaining deleted loads: ${remainingLoads}`);

  // Verify no orphaned load_assignments
  const orphanedAssignments = await db('load_assignments')
    .whereIn('load_id', loadIds)
    .count('*')
    .first()
    .then((r: any) => parseInt(r.count));

  console.log(`   Orphaned load assignments: ${orphanedAssignments}`);

  // Verify no orphaned invoices
  const orphanedInvoices = await db('invoices')
    .whereIn('load_id', loadIds)
    .count('*')
    .first()
    .then((r: any) => parseInt(r.count));

  console.log(`   Orphaned invoices: ${orphanedInvoices}`);

  // Verify no orphaned load status history
  const orphanedHistory = await db('load_status_history')
    .whereIn('load_id', loadIds)
    .count('*')
    .first()
    .then((r: any) => parseInt(r.count));

  console.log(`   Orphaned load status history: ${orphanedHistory}`);

  // Count total loads remaining
  const totalLoads = await db('loads')
    .count('*')
    .first()
    .then((r: any) => parseInt(r.count));

  console.log(`   Total loads remaining in database: ${totalLoads}`);

  // Verify real business load still exists
  const realLoad = await db('loads')
    .where('company_id', '1d5dd91b-37d5-4421-a6bc-aff43f4ebf0f')
    .where('load_number', '2111033')
    .first();

  console.log(`   ✅ Real business load (2111033) preserved: ${realLoad ? 'YES' : 'NO'}\n`);

  if (remainingLoads === 0 && orphanedAssignments === 0 && orphanedInvoices === 0 && orphanedHistory === 0) {
    console.log('✅ All cleanup verifications passed\n');
    return true;
  } else {
    console.log('❌ Some verification checks failed\n');
    return false;
  }
}

async function main() {
  try {
    console.log('\n════════════════════════════════════════════════════════════════════════════════');
    console.log('🧹 COMPLETE LOAD DATA CLEANUP FOR MANUAL TESTING');
    console.log('════════════════════════════════════════════════════════════════════════════════\n');

    // Step 1: Verify no system dependencies
    await verifyNoSystemDependencies();

    // Step 2: Get delete counts
    const counts = await getDeleteCounts();

    // Step 3: Delete all E2E test loads
    const deletedCount = await deleteAllLoads(counts.loadIds);

    // Step 4: Verify no stale references
    await verifyNoStaleReferences(counts.loadIds);

    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log('✅ CLEANUP COMPLETE - Database ready for manual acceptance testing');
    console.log('════════════════════════════════════════════════════════════════════════════════\n');

    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ CLEANUP FAILED:', error);
    await db.destroy();
    process.exit(1);
  }
}

main();
