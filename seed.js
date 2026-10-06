require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const seedData = async () => {
  try {
    console.log('Connecting to database...');
    // 0. Insert Admin User (Password: admin123)
    await pool.query(`
      INSERT INTO users (username, password_hash, role) 
      VALUES ('admin', '$2b$10$X7vQ6a8mGZ2rJ9xQ5q0gEeX1vK9pL3mN2bV5cZ8xQ1wK4mN7bV3cK', 'admin')
      ON CONFLICT (username) DO NOTHING;
    `);
    
    // 1. Insert Products
    await pool.query(`
      INSERT INTO products (id, name, generic_salt, category, sale_price_per_unit, purchase_price_per_unit, conversion_factor) 
      VALUES 
      ('a0eeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Panadol 500mg', 'Paracetamol', 'Tablets', 20.00, 16.00, 1),
      ('b0eeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Augmentin 1000mg', 'Amoxicillin / Clavulanate Potassium', 'Antibiotics', 350.00, 310.00, 1),
      ('c0eeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Brufen 400mg', 'Ibuprofen', 'Tablets', 15.00, 12.00, 1)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 2. Insert Inventory Batches
    await pool.query(`
      INSERT INTO inventory_batches (id, product_id, batch_number, manufacture_date, expiry_date, stock_quantity_in_base_units) 
      VALUES 
      ('d0eeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'a0eeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'B-2026-01', '2025-01-01', '2027-12-31', 150),
      ('e0eeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'b0eeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'B-2026-02', '2025-02-01', '2027-06-30', 45),
      ('f0eeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'c0eeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'B-2026-03', '2025-03-01', '2028-01-15', 80)
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('Sample data successfully inserted into database!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
};

seedData();