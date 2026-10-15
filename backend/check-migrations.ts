import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  migrations: {
    directory: './src/database/migrations',
    loadExtensions: ['.ts'],
  },
});

// Check what migrations have been run
db('knex_migrations').select('*').orderBy('id')
  .then((rows: any[]) => {
    console.log('Migrations applied:');
    rows.forEach((r: any) => console.log(` - ${r.name} (batch ${r.batch})`));
    db.destroy();
  })
  .catch((err: any) => {
    console.error('Error:', err.message);
    db.destroy();
    process.exit(1);
  });
