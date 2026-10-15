import { Knex } from 'knex';

/**
 * Migration: Expand driver status to support ON_LEAVE and ASSIGNED values.
 * - ACTIVE: Driver is available (default)
 * - ASSIGNED: Auto-set when driver is assigned to a load (by dispatch system)
 * - ON_LEAVE: Manually set when driver is on leave/vacation
 * - INACTIVE: Driver is disabled/no longer active
 */
export async function up(knex: Knex): Promise<void> {
  // For PostgreSQL: drop any existing check constraint on status, then recreate
  // This is safe even if no constraint exists (wrapped in try/catch logic)
  const client = knex.client.config.client as string;

  if (client === 'pg' || client === 'postgresql') {
    // Drop old constraint if it exists
    await knex.raw(`
      DO $$ 
      BEGIN
        ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_status_check;
      EXCEPTION WHEN others THEN NULL;
      END $$;
    `);

    // Set a wider default and update any NULL values
    await knex.raw(`
      ALTER TABLE drivers ALTER COLUMN status SET DEFAULT 'ACTIVE';
      UPDATE drivers SET status = 'ACTIVE' WHERE status IS NULL OR status NOT IN ('ACTIVE', 'ASSIGNED', 'ON_LEAVE', 'INACTIVE');
    `);
  } else {
    // For SQLite or other DBs: just update invalid rows
    await knex('drivers')
      .whereNotIn('status', ['ACTIVE', 'ASSIGNED', 'ON_LEAVE', 'INACTIVE'])
      .update({ status: 'ACTIVE' });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Revert ASSIGNED and ON_LEAVE back to ACTIVE on rollback
  await knex('drivers')
    .whereIn('status', ['ASSIGNED', 'ON_LEAVE'])
    .update({ status: 'ACTIVE' });
}
