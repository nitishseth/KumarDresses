require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      -- ===== USERS & SHOP =====
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','staff','user')),
        picture TEXT,
        phone TEXT,
        store_id INTEGER,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS shop_config (
        id SERIAL PRIMARY KEY,
        shop_name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        email TEXT,
        gst_number TEXT,
        logo TEXT,
        tagline TEXT,
        configured INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- ===== STORES / LOCATIONS =====
      CREATE TABLE IF NOT EXISTS stores (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        address TEXT,
        phone TEXT,
        is_warehouse INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- ===== CATEGORIES (hierarchical) =====
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        level INTEGER DEFAULT 0,
        description TEXT,
        size_chart_id INTEGER,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- ===== SIZE CHARTS =====
      CREATE TABLE IF NOT EXISTS size_charts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category_type TEXT,
        garment_type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS size_chart_entries (
        id SERIAL PRIMARY KEY,
        size_chart_id INTEGER NOT NULL REFERENCES size_charts(id) ON DELETE CASCADE,
        size_label TEXT NOT NULL,
        chest REAL, waist REAL, hip REAL, length REAL,
        shoulder REAL, sleeve REAL, inseam REAL,
        sort_order INTEGER DEFAULT 0
      );

      -- ===== PRODUCTS =====
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        sku TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        brand TEXT,
        fabric TEXT,
        material TEXT,
        season TEXT,
        gender TEXT DEFAULT '',
        collection TEXT,
        mrp REAL NOT NULL,
        cost_price REAL DEFAULT 0,
        selling_price REAL NOT NULL,
        hsn_code TEXT,
        tax_percent REAL DEFAULT 0,
        description TEXT,
        image TEXT,
        barcode TEXT UNIQUE NOT NULL,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- ===== WISHLISTS =====
      CREATE TABLE IF NOT EXISTS wishlists (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_id TEXT,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      );

      -- ===== PRODUCT VARIANTS (Size + Color + Fit) =====
      CREATE TABLE IF NOT EXISTS product_variants (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        sku_variant TEXT UNIQUE NOT NULL,
        size TEXT NOT NULL,
        color TEXT DEFAULT '',
        fit TEXT DEFAULT '',
        barcode TEXT UNIQUE NOT NULL,
        image TEXT,
        additional_price REAL DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- ===== STOCK PER VARIANT PER STORE =====
      CREATE TABLE IF NOT EXISTS variant_stock (
        id SERIAL PRIMARY KEY,
        variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
        store_id INTEGER NOT NULL REFERENCES stores(id),
        quantity INTEGER NOT NULL DEFAULT 0,
        reserved_quantity INTEGER NOT NULL DEFAULT 0,
        reorder_point INTEGER NOT NULL DEFAULT 5,
        batch_number TEXT,
        received_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(variant_id, store_id)
      );

      -- ===== STOCK MOVEMENTS (audit trail) =====
      CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        variant_id INTEGER NOT NULL REFERENCES product_variants(id),
        store_id INTEGER NOT NULL REFERENCES stores(id),
        movement_type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        reference_type TEXT,
        reference_id INTEGER,
        batch_number TEXT,
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- ===== STOCK TRANSFERS =====
      CREATE TABLE IF NOT EXISTS stock_transfers (
        id SERIAL PRIMARY KEY,
        transfer_number TEXT UNIQUE NOT NULL,
        from_store_id INTEGER NOT NULL REFERENCES stores(id),
        to_store_id INTEGER NOT NULL REFERENCES stores(id),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_transit','completed','cancelled')),
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS stock_transfer_items (
        id SERIAL PRIMARY KEY,
        transfer_id INTEGER NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
        variant_id INTEGER NOT NULL REFERENCES product_variants(id),
        quantity INTEGER NOT NULL,
        received_quantity INTEGER DEFAULT 0
      );

      -- ===== STOCK RESERVATIONS =====
      CREATE TABLE IF NOT EXISTS stock_reservations (
        id SERIAL PRIMARY KEY,
        variant_id INTEGER NOT NULL REFERENCES product_variants(id),
        store_id INTEGER NOT NULL REFERENCES stores(id),
        quantity INTEGER NOT NULL,
        reason TEXT,
        reference_number TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active','fulfilled','cancelled','expired')),
        expires_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- ===== BATCHES / LOTS =====
      CREATE TABLE IF NOT EXISTS batches (
        id SERIAL PRIMARY KEY,
        batch_number TEXT UNIQUE NOT NULL,
        supplier TEXT,
        store_id INTEGER REFERENCES stores(id),
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        received_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS batch_items (
        id SERIAL PRIMARY KEY,
        batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
        variant_id INTEGER NOT NULL REFERENCES product_variants(id),
        quantity INTEGER NOT NULL,
        cost_price REAL
      );

      -- ===== BILLING =====
      CREATE TABLE IF NOT EXISTS bills (
        id SERIAL PRIMARY KEY,
        bill_number TEXT UNIQUE NOT NULL,
        store_id INTEGER REFERENCES stores(id),
        customer_name TEXT,
        customer_phone TEXT,
        subtotal REAL NOT NULL,
        discount REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        paid_amount REAL NOT NULL DEFAULT 0,
        payment_status TEXT DEFAULT 'full' CHECK(payment_status IN ('full','partial')),
        payment_method TEXT DEFAULT 'cash',
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bill_items (
        id SERIAL PRIMARY KEY,
        bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        variant_id INTEGER NOT NULL REFERENCES product_variants(id),
        product_name TEXT NOT NULL,
        sku TEXT,
        size TEXT,
        color TEXT,
        fit TEXT,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        discount REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        total REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payment_history (
        id SERIAL PRIMARY KEY,
        bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'cash',
        notes TEXT,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default admin
    const adminCheck = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      const hash = bcrypt.hashSync('admin123', 10);
      await client.query('INSERT INTO users (username,password,name,role) VALUES ($1,$2,$3,$4)', ['admin', hash, 'Administrator', 'admin']);
    }

    // Seed default shop config
    const shopCheck = await client.query('SELECT id FROM shop_config LIMIT 1');
    if (shopCheck.rows.length === 0) {
      await client.query('INSERT INTO shop_config (shop_name,configured) VALUES ($1,$2)', ['Kumar Dresses', 0]);
    }

    // Seed default store
    const storeCheck = await client.query('SELECT id FROM stores LIMIT 1');
    if (storeCheck.rows.length === 0) {
      await client.query('INSERT INTO stores (name,code,address,is_warehouse) VALUES ($1,$2,$3,$4)', ['Main Store', 'MAIN', 'Default Location', 0]);
    }

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

// Helper: query wrapper
const db = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool
};

// Initialize on startup
initDB().catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});

module.exports = db;
