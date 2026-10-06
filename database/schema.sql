-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (Authentication & RBAC)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('cashier', 'manager', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Default admin (agar pehle se maujood ho to skip hoga)
INSERT INTO users (username, password, role)
VALUES ('admin', '5859', 'admin')
ON CONFLICT (username) DO NOTHING;

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    generic_salt VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    sale_price_per_unit NUMERIC(10, 2) NOT NULL,
    purchase_price_per_unit NUMERIC(10, 2) NOT NULL,
    tax_rate NUMERIC(5, 2) DEFAULT 0.00,
    conversion_factor INTEGER NOT NULL DEFAULT 1,
    reorder_level INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Inventory Batches Table (FEFO Tracking)
CREATE TABLE IF NOT EXISTS inventory_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    manufacture_date DATE,
    expiry_date DATE NOT NULL,
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    stock_quantity_in_base_units INTEGER NOT NULL CHECK (stock_quantity_in_base_units >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    current_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Supplier Ledger Table
CREATE TABLE IF NOT EXISTS supplier_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('payment', 'credit')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Sales / Invoices Table
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_no VARCHAR(100) UNIQUE NOT NULL,
    cashier_id INTEGER REFERENCES users(id),
    subtotal NUMERIC(12, 2) NOT NULL,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    tax NUMERIC(12, 2) DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Sale Items Table
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    batch_id UUID REFERENCES inventory_batches(id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10, 2) DEFAULT 0.00,
    line_total NUMERIC(10, 2) NOT NULL
);

-- Invoice sequence
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1001;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_inventory_fefo ON inventory_batches (product_id, expiry_date ASC);
CREATE INDEX IF NOT EXISTS idx_products_search ON products (name, generic_salt);