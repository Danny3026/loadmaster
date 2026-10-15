export async function up(knex) {
    await knex.raw(`
    ALTER TABLE loads DROP CONSTRAINT IF EXISTS loads_status_check;
    ALTER TABLE loads ADD CONSTRAINT loads_status_check CHECK (status IN ('pending', 'dispatched', 'in_transit', 'delivered', 'cancelled'));
  `);
}
export async function down(knex) {
    await knex.raw(`
    UPDATE loads SET status = 'pending' WHERE status = 'cancelled';
    ALTER TABLE loads DROP CONSTRAINT IF EXISTS loads_status_check;
    ALTER TABLE loads ADD CONSTRAINT loads_status_check CHECK (status IN ('pending', 'dispatched', 'in_transit', 'delivered'));
  `);
}
