const fs = require('fs');
const path = require('path');
const pool = require('./db');

const alterSql = `
  ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level INT NOT NULL DEFAULT 10;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode ON products (barcode) WHERE barcode IS NOT NULL;
  ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2) NOT NULL DEFAULT 0;
  CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1001;
`;

(async () => {
  try {
    const db = await pool.query('SELECT current_database() AS db');
    console.log('Connected database:', db.rows[0].db);

    const schemaPath = path.join(__dirname, '../database/schema.sql');
    try {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
      console.log('✅ schema.sql executed');
    } catch (err) {
      console.warn('⚠️ schema.sql warning:', err.message);
    }

    await pool.query(alterSql);
    console.log('✅ Migration executed successfully!');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    process.exit(0);
  }
})();