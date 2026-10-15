import database from './src/config/database';

const db = database;

interface LoadAudit {
  id: string;
  load_number: string;
  broker_reference: string;
  status: string;
  pickup_city: string;
  delivery_city: string;
  commodity: string;
  equipment_type: string;
  classification: 'E2E_TEST' | 'SEED_DEMO' | 'REAL_BUSINESS' | 'UNCERTAIN';
  reason: string;
  assignment_count: number;
  invoices_count: number;
  settlements_count: number;
  pod_docs_count: number;
  total_dependencies: number;
}

async function auditLoads() {
  try {
    console.log('\n════════════════════════════════════════════════════════════════════════════════');
    console.log('🔍 LOAD DATA AUDIT FOR TEST/SEED CLEANUP');
    console.log('════════════════════════════════════════════════════════════════════════════════\n');

    // Get all loads with details
    const loads = await db('loads')
      .select(
        'loads.id',
        'loads.load_number',
        'loads.broker_reference',
        'loads.status',
        'loads.commodity',
        'loads.equipment_type',
        'loads.created_at'
      )
      .where('loads.company_id', '1d5dd91b-37d5-4421-a6bc-aff43f4ebf0f')
      .orderBy('loads.created_at', 'desc');

    console.log(`📦 Total loads found: ${loads.length}\n`);

    const audits: LoadAudit[] = [];
    let e2eCount = 0;
    let seedCount = 0;
    let realCount = 0;
    let uncertainCount = 0;

    for (const load of loads) {
      // Get load stops for pickup/delivery locations
      const stops = await db('load_stops').where('load_id', load.id).orderBy('stop_sequence', 'asc');

      const pickupStop = stops.find((s: any) => s.stop_type === 'PICKUP');
      const deliveryStop = stops.find((s: any) => s.stop_type === 'DELIVERY');

      const pickupCity = pickupStop?.city || pickupStop?.facility_name || 'Unknown';
      const deliveryCity = deliveryStop?.city || deliveryStop?.facility_name || 'Unknown';

      // Count dependencies
      const assignmentCount = await db('load_assignments')
        .where('load_id', load.id)
        .count('*')
        .first()
        .then((r: any) => parseInt(r.count));

      const invoiceCount = await db('invoices')
        .where('load_id', load.id)
        .count('*')
        .first()
        .then((r: any) => parseInt(r.count));

      // Settlements store load_ids as JSONB array, need to check if load.id is in the array
      const settlementCount = await db('settlements')
        .where('load_ids', '@@', `"${load.id}"`)
        .count('*')
        .first()
        .then((r: any) => parseInt(r.count))
        .catch(() => 0); // Fallback if JSONB query fails

      const podCount = await db('documents')
        .where('load_id', load.id)
        .where('document_type', 'POD')
        .count('*')
        .first()
        .then((r: any) => parseInt(r.count));

      // Classify load
      let classification: 'E2E_TEST' | 'SEED_DEMO' | 'REAL_BUSINESS' | 'UNCERTAIN' = 'UNCERTAIN';
      let reason = '';

      // E2E test detection: load_number or broker_reference starts with E2E- or contains 'e2e'
      if (
        load.load_number.includes('E2E-') ||
        load.load_number.toLowerCase().includes('e2e') ||
        (load.broker_reference && load.broker_reference.includes('E2E-')) ||
        (load.broker_reference && load.broker_reference.toLowerCase().includes('e2e'))
      ) {
        classification = 'E2E_TEST';
        reason = 'E2E test prefix in load_number or broker_reference';
        e2eCount++;
      }
      // Test location detection
      else if (
        pickupCity.toLowerCase().includes('test') ||
        deliveryCity.toLowerCase().includes('test') ||
        pickupCity.toLowerCase().includes('demo') ||
        deliveryCity.toLowerCase().includes('demo') ||
        pickupCity === 'Test Pickup Location' ||
        deliveryCity === 'Test Delivery Location'
      ) {
        classification = 'E2E_TEST';
        reason = 'Test location names detected';
        e2eCount++;
      }
      // Seed demo detection
      else if (
        pickupCity.toLowerCase().includes('warehouse') ||
        deliveryCity.toLowerCase().includes('warehouse') ||
        load.load_number.includes('SEED-') ||
        load.load_number.includes('DEMO-')
      ) {
        classification = 'SEED_DEMO';
        reason = 'Seed/demo pattern detected';
        seedCount++;
      }
      // Real business data - has legitimate locations and load numbers
      else if (
        pickupCity.length > 3 &&
        deliveryCity.length > 3 &&
        !load.load_number.match(/^test|^demo|^e2e/i)
      ) {
        classification = 'REAL_BUSINESS';
        reason = 'Legitimate business data';
        realCount++;
      } else {
        classification = 'UNCERTAIN';
        reason = 'Cannot determine classification';
        uncertainCount++;
      }

      audits.push({
        id: load.id,
        load_number: load.load_number,
        broker_reference: load.broker_reference || 'N/A',
        status: load.status,
        pickup_city: pickupCity,
        delivery_city: deliveryCity,
        commodity: load.commodity || 'N/A',
        equipment_type: load.equipment_type || 'N/A',
        classification,
        reason,
        assignment_count: assignmentCount,
        invoices_count: invoiceCount,
        settlements_count: settlementCount,
        pod_docs_count: podCount,
        total_dependencies: assignmentCount + invoiceCount + settlementCount + podCount,
      });
    }

    // Display summary
    console.log('📊 CLASSIFICATION SUMMARY:');
    console.log(`   E2E/TEST loads: ${e2eCount}`);
    console.log(`   SEED/DEMO loads: ${seedCount}`);
    console.log(`   REAL BUSINESS loads: ${realCount}`);
    console.log(`   UNCERTAIN loads: ${uncertainCount}\n`);

    // Display E2E/TEST loads with dependencies
    const e2eLoads = audits.filter((a) => a.classification === 'E2E_TEST');
    if (e2eLoads.length > 0) {
      console.log('🗑️  E2E/TEST LOADS (Safe to Delete):');
      e2eLoads.forEach((load, i) => {
        console.log(`   ${i + 1}. ${load.load_number} (${load.status})`);
        console.log(`      From: ${load.pickup_city} → To: ${load.delivery_city}`);
        console.log(
          `      Dependencies: ${load.assignment_count} assignments, ${load.invoices_count} invoices, ${load.settlements_count} settlements, ${load.pod_docs_count} PODs`
        );
      });
      console.log('');
    }

    // Display SEED loads
    const seedLoads = audits.filter((a) => a.classification === 'SEED_DEMO');
    if (seedLoads.length > 0) {
      console.log('📦 SEED/DEMO LOADS (Safe to Delete):');
      seedLoads.forEach((load, i) => {
        console.log(`   ${i + 1}. ${load.load_number} (${load.status})`);
        console.log(`      From: ${load.pickup_city} → To: ${load.delivery_city}`);
        console.log(
          `      Dependencies: ${load.assignment_count} assignments, ${load.invoices_count} invoices, ${load.settlements_count} settlements, ${load.pod_docs_count} PODs`
        );
      });
      console.log('');
    }

    // Display REAL loads
    const realLoads = audits.filter((a) => a.classification === 'REAL_BUSINESS');
    if (realLoads.length > 0) {
      console.log('✅ REAL BUSINESS LOADS (Do NOT Delete):');
      realLoads.forEach((load, i) => {
        console.log(`   ${i + 1}. ${load.load_number} (${load.status})`);
        console.log(`      From: ${load.pickup_city} → To: ${load.delivery_city}`);
        console.log(`      Dependencies: ${load.total_dependencies}`);
      });
      console.log('');
    }

    // Display UNCERTAIN loads
    const uncertainLoads = audits.filter((a) => a.classification === 'UNCERTAIN');
    if (uncertainLoads.length > 0) {
      console.log('❓ UNCERTAIN LOADS (Manual Review Required):');
      uncertainLoads.forEach((load, i) => {
        console.log(`   ${i + 1}. ${load.load_number} (${load.status}) - ${load.reason}`);
        console.log(`      From: ${load.pickup_city} → To: ${load.delivery_city}`);
        console.log(`      Dependencies: ${load.total_dependencies}`);
      });
      console.log('');
    }

    // Summary statistics
    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log('📈 DELETION IMPACT ANALYSIS:');
    console.log(`   Total E2E/SEED loads to remove: ${e2eLoads.length + seedLoads.length}`);
    console.log(
      `   Total dependencies to cascade: ${(e2eLoads.concat(seedLoads).reduce((sum, l) => sum + l.total_dependencies, 0))}`
    );
    console.log(`   Total real business loads preserved: ${realLoads.length}`);
    console.log(`   Uncertain loads (review needed): ${uncertainLoads.length}`);
    console.log('════════════════════════════════════════════════════════════════════════════════\n');

    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Audit failed:', error);
    await db.destroy();
    process.exit(1);
  }
}

auditLoads();
