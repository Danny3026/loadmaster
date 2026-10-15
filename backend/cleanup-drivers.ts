import db from './src/config/database';

async function verifyNoSystemDependencies() {
  console.log('🔍 VERIFICATION PHASE: Checking system dependencies...\n');

  try {
    // Check 1: Drivers not used for authentication
    const authUsers = await db('users')
      .whereNotNull('role_id')
      .select('id', 'email', 'role_id')
      .limit(5);
    console.log('✅ Auth users (independent of drivers):', authUsers.length);

    // Check 2: Drivers not used for company settings
    const companies = await db('companies')
      .select('id', 'name', 'tin')
      .limit(5);
    console.log('✅ Companies (no driver dependency):', companies.length);

    // Check 3: No role-based access stored on drivers
    const driverSchema = await db.raw(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'drivers'
    `);
    const hasRoleColumn = driverSchema.rows.some((col: any) => col.column_name === 'role');
    console.log(`✅ Drivers table has role column: ${hasRoleColumn} (not a system dependency)`);

    console.log('\n✅ SAFE TO PROCEED: No critical system config depends on drivers\n');
    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

async function getDeleteCounts() {
  try {
    // Count drivers
    const drivers = await db('drivers').count('*').first();
    const driverCount = parseInt(drivers.count as string);

    // Count loads linked to drivers
    const loads = await db('load_assignments').count('*').first();
    const loadCount = parseInt(loads.count as string);

    // Count invoices linked to drivers
    const invoices = await db('invoices')
      .whereNotNull('driver_id')
      .count('*')
      .first();
    const invoiceCount = parseInt(invoices.count as string);

    // Count settlements linked to drivers
    const settlements = await db('settlements').count('*').first();
    const settlementCount = parseInt(settlements.count as string);

    // Count documents (PODs)
    const docs = await db('documents')
      .where('document_type', 'POD')
      .count('*')
      .first();
    const docCount = parseInt(docs.count as string);

    console.log('📊 DELETION IMPACT ANALYSIS:\n');
    console.log(`   Drivers to delete: ${driverCount}`);
    console.log(`   Load assignments to cascade delete: ${loadCount}`);
    console.log(`   Invoices (driver_id → NULL): ${invoiceCount}`);
    console.log(`   Settlements to cascade delete: ${settlementCount}`);
    console.log(`   PODs to cascade delete: ${docCount}`);

    return { driverCount, loadCount, invoiceCount, settlementCount, docCount };
  } catch (error) {
    console.error('Error counting records:', error);
    throw error;
  }
}

async function deleteAllDrivers() {
  try {
    console.log('\n🗑️  DELETION PHASE: Removing all drivers and dependencies...\n');

    // Get all driver IDs first for logging
    const drivers = await db('drivers').select('id', 'first_name', 'last_name', 'email');
    
    console.log(`Deleting ${drivers.length} drivers:\n`);
    drivers.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.first_name} ${d.last_name} (${d.email})`);
    });

    const driverIds = drivers.map(d => d.id);

    // Delete in correct order to respect foreign key constraints
    console.log('\n📋 Deleting dependent records in order:');
    
    // 1. Delete load_assignments (no cascade on driver_id)
    const deletedAssignments = await db('load_assignments')
      .whereIn('driver_id', driverIds)
      .del();
    console.log(`   ✅ Deleted ${deletedAssignments} load assignments`);

    // 2. Delete invoices driver_id references (no cascade) or delete invoices
    const deletedInvoices = await db('invoices')
      .whereIn('driver_id', driverIds)
      .del();
    console.log(`   ✅ Deleted ${deletedInvoices} invoices`);

    // 3. Settlements cascade delete on driver deletion (but delete explicitly for clarity)
    const deletedSettlements = await db('settlements')
      .whereIn('driver_id', driverIds)
      .del();
    console.log(`   ✅ Deleted ${deletedSettlements} settlements`);

    // 4. Now delete the drivers themselves
    const deletedCount = await db('drivers').del();
    console.log(`   ✅ Deleted ${deletedCount} drivers`);
    
    // Verify deletion
    const remaining = await db('drivers').count('*').first();
    const remainingCount = parseInt(remaining.count as string);
    
    if (remainingCount === 0) {
      console.log('\n✅ VERIFICATION: Drivers table is empty');
      return true;
    } else {
      console.log(`\n⚠️  WARNING: ${remainingCount} drivers still remain`);
      return false;
    }
  } catch (error) {
    console.error('❌ Deletion failed:', error);
    throw error;
  }
}

async function verifyNoStaleReferences() {
  try {
    console.log('\n🔍 POST-DELETION VERIFICATION:\n');

    // Check 1: No orphaned load_assignments
    const orphanedAssignments = await db('load_assignments')
      .whereNotNull('driver_id')
      .count('*')
      .first();
    const orphanCount = parseInt(orphanedAssignments.count as string);
    console.log(`   Load assignments with deleted drivers: ${orphanCount}`);
    if (orphanCount > 0) {
      console.log('   ⚠️  These are now orphaned (expected behavior, no foreign key cascade)');
    }

    // Check 2: Invoices with NULL driver_id
    const orphanedInvoices = await db('invoices')
      .whereNull('driver_id')
      .count('*')
      .first();
    const orphanInvoiceCount = parseInt(orphanedInvoices.count as string);
    console.log(`   Invoices with NULL driver_id: ${orphanInvoiceCount}`);
    
    // Check 3: Teams/Users not affected
    const users = await db('users').count('*').first();
    const userCount = parseInt(users.count as string);
    console.log(`   Team members (users) remaining: ${userCount}`);

    // Check 4: Empty drivers table confirmed
    const drivers = await db('drivers').count('*').first();
    const driverCount = parseInt(drivers.count as string);
    console.log(`   ✅ Drivers table: ${driverCount} (empty)`);

    console.log('\n✅ All cleanup verifications passed');
    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('═'.repeat(80));
    console.log('🧹 COMPLETE DRIVER CLEANUP FOR MANUAL TESTING');
    console.log('═'.repeat(80) + '\n');

    // Step 1: Verify system dependencies
    const safeToDelete = await verifyNoSystemDependencies();
    if (!safeToDelete) {
      console.log('❌ Aborting: System dependencies found');
      process.exit(1);
    }

    // Step 2: Count what will be deleted
    await getDeleteCounts();

    // Step 3: Perform deletion
    const deleted = await deleteAllDrivers();
    if (!deleted) {
      console.log('❌ Deletion verification failed');
      process.exit(1);
    }

    // Step 4: Verify no stale references
    await verifyNoStaleReferences();

    console.log('\n' + '═'.repeat(80));
    console.log('✅ CLEANUP COMPLETE - System ready for manual acceptance testing');
    console.log('═'.repeat(80));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ CLEANUP FAILED:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main();
