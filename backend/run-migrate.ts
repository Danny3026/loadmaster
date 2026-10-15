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

db.migrate.latest()
  .then((result: any) => {
    console.log('✅ Migration complete:', result);
    db.destroy();
  })
  .catch((err: any) => {
    console.error('❌ Migration error:', err.message);
    db.destroy();
    process.exit(1);
  });
