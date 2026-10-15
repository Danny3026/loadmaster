import db from './src/config/database';

async function auditDrivers() {
  try {
    console.log('🔍 DRIVER AUDIT - Analyzing all drivers and their relationships\n');

    // Get all drivers
    const drivers = await db('drivers')
      .select('*')
      .orderBy('created_at', 'desc');

    console.log(`Found ${drivers.length} drivers\n`);
    console.log('━'.repeat(120));

    for (const driver of drivers) {
      const driverName = `${driver.first_name} ${driver.last_name}`;
      const isE2E = driver.first_name.startsWith('E2E-') || driver.email?.includes('@e2e.test');
      const classification = isE2E ? '🧪 E2E/TEST DATA' : '👤 REAL/SEED DATA';

      // Count related records
      const loadAssignments = await db('load_assignments')
        .where('driver_id', driver.id)
        .count('*')
        .first();

      const loads = await db('loads')
        .join('load_assignments', 'loads.id', 'load_assignments.load_id')
        .where('load_assignments.driver_id', driver.id)
        .select('loads.id', 'loads.load_number', 'loads.status')
        .distinct();

      const invoices = await db('invoices')
        .where('driver_id', driver.id)
        .select('id', 'invoice_number', 'status', 'payment_status');

      const settlements = await db('settlements')
        .where('driver_id', driver.id)
        .select('id', 'status', 'period_start', 'period_end', 'load_count');

      const documents = await db('documents')
        .whereIn('load_id', loads.map(l => l.id))
        .select('id', 'document_type', 'load_id');

      const linkedUser = driver.user_id ? await db('users').where('id', driver.user_id).first() : null;

      console.log(`\n${classification}`);
      console.log(`Name: ${driverName}`);
      console.log(`Email: ${driver.email || 'N/A'}`);
      console.log(`Status: ${driver.status}`);
      console.log(`Created: ${driver.created_at}`);
      console.log(`Company ID: ${driver.company_id}`);
      
      if (linkedUser) {
        console.log(`✅ Linked User: ${linkedUser.email} (${linkedUser.role})`);
      } else {
        console.log(`❌ No linked user`);
      }

      console.log(`\nRelationships:`);
      console.log(`  📦 Loads: ${loads.length}`);
      if (loads.length > 0) {
        loads.forEach(l => {
          console.log(`     - ${l.load_number} (${l.status})`);
        });
      }

      console.log(`  📄 Invoices: ${invoices.length}`);
      if (invoices.length > 0) {
        invoices.forEach(i => {
          console.log(`     - ${i.invoice_number} (${i.status}, ${i.payment_status})`);
        });
      }

      console.log(`  🤝 Settlements: ${settlements.length}`);
      if (settlements.length > 0) {
        settlements.forEach(s => {
          console.log(`     - ${s.period_start} to ${s.period_end} (${s.status}, ${s.load_count} loads)`);
        });
      }

      console.log(`  📋 PODs/Documents: ${documents.length}`);
      if (documents.length > 0) {
        documents.forEach(d => {
          console.log(`     - ${d.document_type}`);
        });
      }

      // Safety assessment
      const hasRelations = loads.length > 0 || invoices.length > 0 || settlements.length > 0;
      const safeToDelete = !hasRelations;
      const safeStatus = safeToDelete ? '✅ SAFE TO DELETE' : '⚠️  HAS DEPENDENCIES';
      console.log(`\n${safeStatus}`);
      console.log('━'.repeat(120));
    }

    console.log('\n\n📊 SUMMARY\n');
    const e2eDrivers = drivers.filter(d => d.first_name.startsWith('E2E-') || d.email?.includes('@e2e.test'));
    const realDrivers = drivers.filter(d => !d.first_name.startsWith('E2E-') && !d.email?.includes('@e2e.test'));
    
    console.log(`Total Drivers: ${drivers.length}`);
    console.log(`  - E2E/Test Data: ${e2eDrivers.length}`);
    console.log(`  - Real/Seed Data: ${realDrivers.length}`);

    // Count safe deletions
    let safeCount = 0;
    for (const driver of e2eDrivers) {
      const loadAssignments = await db('load_assignments')
        .where('driver_id', driver.id)
        .count('*')
        .first();
      const invoices = await db('invoices')
        .where('driver_id', driver.id)
        .count('*')
        .first();
      const settlements = await db('settlements')
        .where('driver_id', driver.id)
        .count('*')
        .first();

      if (loadAssignments.count === 0 && invoices.count === 0 && settlements.count === 0) {
        safeCount++;
      }
    }

    console.log(`\n🧹 E2E drivers safe to delete (no dependencies): ${safeCount}`);
    console.log(`⚠️  E2E drivers with dependencies: ${e2eDrivers.length - safeCount}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

auditDrivers();
