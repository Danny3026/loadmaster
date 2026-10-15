/**
 * Database Diagnostics Script
 * 
 * This script helps diagnose issues with driver creation by checking:
 * 1. Database connection
 * 2. Companies exist
 * 3. Users exist and have valid company_id
 * 4. Sample test data
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

import knex from 'knex';

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
});

async function diagnose() {
  console.log('\n📊 LoadMaster Database Diagnostics\n');
  console.log('━'.repeat(60));

  try {
    // Test connection
    console.log('\n✓ Testing database connection...');
    await db.raw('SELECT 1');
    console.log('✅ Database connection successful');

    // Check companies
    console.log('\n✓ Checking companies table...');
    const companies = await db('companies').select('*');
    if (companies.length === 0) {
      console.log('⚠️  NO COMPANIES FOUND - This will cause driver creation to fail!');
      console.log('   Run: npm run seed');
    } else {
      console.log(`✅ Found ${companies.length} company/companies:`);
      companies.forEach((c: any) => {
        console.log(`   - ${c.name} (id: ${c.id})`);
      });
    }

    // Check users
    console.log('\n✓ Checking users table...');
    const users = await db('users')
      .select('users.id', 'users.email', 'users.first_name', 'users.company_id', 'companies.name as company_name')
      .leftJoin('companies', 'users.company_id', 'companies.id');

    if (users.length === 0) {
      console.log('⚠️  NO USERS FOUND - Run: npm run seed');
    } else {
      console.log(`✅ Found ${users.length} user(s):`);
      users.forEach((u: any) => {
        const companyOK = u.company_name ? '✅' : '❌';
        console.log(`   ${companyOK} ${u.email} → Company: ${u.company_name || 'NULL (INVALID!)'}`);
      });
    }

    // Check drivers
    console.log('\n✓ Checking drivers table...');
    const drivers = await db('drivers')
      .select('drivers.id', 'drivers.first_name', 'drivers.last_name', 'drivers.company_id', 'companies.name as company_name')
      .leftJoin('companies', 'drivers.company_id', 'companies.id');

    if (drivers.length === 0) {
      console.log('✅ Drivers table is empty (ready for new entries)');
    } else {
      console.log(`✅ Found ${drivers.length} driver(s):`);
      drivers.forEach((d: any) => {
        const companyOK = d.company_name ? '✅' : '❌';
        console.log(`   ${companyOK} ${d.first_name} ${d.last_name} → Company: ${d.company_name || 'NULL (INVALID!)'}`);
      });
    }

    // Test login credentials
    console.log('\n✓ Sample login credentials for testing:');
    const admins = users.filter((u: any) => u.email === 'admin@example.com' || u.email === 'dispatcher@example.com');
    if (admins.length > 0) {
      admins.forEach((u: any) => {
        console.log(`   Email: ${u.email}`);
        console.log(`   Password: Password123!`);
        console.log(`   Company: ${u.company_name || 'UNKNOWN'}\n`);
      });
    }

    console.log('\n' + '━'.repeat(60));
    console.log('📋 Summary:\n');

    const hasCompanies = companies.length > 0;
    const hasUsers = users.length > 0 && users.every((u: any) => u.company_name);
    const dbReady = hasCompanies && hasUsers;

    if (dbReady) {
      console.log('✅ Database is properly configured!');
      console.log('\nYou can now:');
      console.log('   1. Start the backend: npm run dev');
      console.log('   2. Start the frontend: cd ../frontend && npm run dev');
      console.log('   3. Login and create drivers');
    } else {
      console.log('❌ Database has issues that need to be fixed:');
      if (!hasCompanies) console.log('   - Run migrations: npm run migrate');
      if (!hasUsers) console.log('   - Run seeds: npm run seed');
    }

    console.log('\n' + '━'.repeat(60) + '\n');

  } catch (err: any) {
    console.error('\n❌ Diagnostics failed:', err.message);
    console.log('\nCommon causes:');
    console.log('   - PostgreSQL is not running');
    console.log('   - DATABASE_URL in .env is incorrect');
    console.log('   - Database does not exist');
    console.log('\nFix:');
    console.log('   1. Check .env DATABASE_URL');
    console.log('   2. Ensure PostgreSQL is running');
    console.log('   3. Create database if needed:');
    console.log('      createdb loadmaster');
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

diagnose();
