export async function up(knex) {
    await knex.raw(`
    ALTER TABLE loads ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE loads ALTER COLUMN status TYPE text USING status::text;
    ALTER TABLE loads DROP CONSTRAINT IF EXISTS loads_status_check;
    UPDATE loads SET status = CASE status
      WHEN 'NEW' THEN 'pending'
      WHEN 'ASSIGNED' THEN 'pending'
      WHEN 'DISPATCHED' THEN 'dispatched'
      WHEN 'AT_PICKUP' THEN 'in_transit'
      WHEN 'PICKED_UP' THEN 'in_transit'
      WHEN 'IN_TRANSIT' THEN 'in_transit'
      WHEN 'AT_DELIVERY' THEN 'in_transit'
      WHEN 'DELIVERED' THEN 'delivered'
      WHEN 'COMPLETED' THEN 'delivered'
      ELSE status
    END;
    ALTER TABLE loads ADD CONSTRAINT loads_status_check CHECK (status IN ('pending', 'dispatched', 'in_transit', 'delivered'));
    ALTER TABLE loads ALTER COLUMN status SET DEFAULT 'pending';
  `);
}
export async function down(knex) {
    await knex.raw(`
    ALTER TABLE loads DROP CONSTRAINT IF EXISTS loads_status_check;
    ALTER TABLE loads ALTER COLUMN status SET DEFAULT 'NEW';
  `);
}
