export async function up(knex) {
    const columnsResult = await knex.raw(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'companies'
      AND table_schema = current_schema()
  `);
    const existingColumns = new Set((columnsResult.rows || []).map((row) => row.column_name));
    const pendingColumns = [];
    if (!existingColumns.has('logo_url'))
        pendingColumns.push("ADD COLUMN logo_url varchar(255)");
    if (!existingColumns.has('brand_color'))
        pendingColumns.push("ADD COLUMN brand_color varchar(255) DEFAULT '#1a5fb4'");
    if (!existingColumns.has('dispatch_notification_template'))
        pendingColumns.push('ADD COLUMN dispatch_notification_template text');
    if (!existingColumns.has('address_line2'))
        pendingColumns.push('ADD COLUMN address_line2 text');
    if (pendingColumns.length > 0) {
        await knex.raw(`ALTER TABLE companies ${pendingColumns.join(', ')}`);
    }
}
export async function down(knex) {
    const columnsResult = await knex.raw(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'companies'
      AND table_schema = current_schema()
  `);
    const existingColumns = new Set((columnsResult.rows || []).map((row) => row.column_name));
    const columnsToDrop = [];
    ['logo_url', 'brand_color', 'dispatch_notification_template', 'address_line2'].forEach((column) => {
        if (existingColumns.has(column))
            columnsToDrop.push(column);
    });
    if (columnsToDrop.length > 0) {
        const dropStatements = columnsToDrop.map((column) => `DROP COLUMN IF EXISTS ${column}`).join(', ');
        await knex.raw(`ALTER TABLE companies ${dropStatements}`);
    }
}
