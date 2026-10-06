const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '5859',
  database: process.env.DB_NAME || 'pharmacy_erp',
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err);
});

module.exports = pool;