import Database from 'better-sqlite3';

const db = new Database('khata.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS shops (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE,
    name TEXT,
    upi_id TEXT
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    shop_id TEXT,
    name TEXT,
    phone TEXT,
    magic_token TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    shop_id TEXT,
    customer_id TEXT,
    proof_image_base64 TEXT,
    raw_transcript TEXT,
    status TEXT DEFAULT 'verified', -- 'verified' | 'disputed' | 'settled'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bill_items (
    id TEXT PRIMARY KEY,
    bill_id TEXT,
    item_name TEXT,
    quantity TEXT,
    amount REAL,
    is_disputed INTEGER DEFAULT 0,
    dispute_note TEXT,
    is_active INTEGER DEFAULT 1,
    replaces_item_id TEXT
  );
`);

// Seed demo data for immediate testing
db.prepare(`INSERT OR IGNORE INTO shops VALUES ('shop_1', 'sharma-kirana', 'Sharma General Store', 'sharmakirana@upi')`).run();
db.prepare(`INSERT OR IGNORE INTO customers VALUES ('cust_1', 'shop_1', 'Rahul Verma', '9876543210', 'demo-rahul-token')`).run();

export default db;
