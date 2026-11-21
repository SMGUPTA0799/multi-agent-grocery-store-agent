import { neon } from '@neondatabase/serverless';

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Missing DATABASE_URL environment variable');
  }
  return neon(url);
}

export async function initSchema() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS shops (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      upi_id TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      magic_token TEXT UNIQUE NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id),
      customer_id TEXT NOT NULL REFERENCES customers(id),
      proof_image_base64 TEXT,
      raw_transcript TEXT,
      status TEXT NOT NULL DEFAULT 'verified',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bill_items (
      id TEXT PRIMARY KEY,
      bill_id TEXT NOT NULL REFERENCES bills(id),
      item_name TEXT NOT NULL,
      quantity TEXT NOT NULL,
      amount NUMERIC(10, 2) NOT NULL,
      is_disputed BOOLEAN NOT NULL DEFAULT FALSE,
      dispute_note TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      replaces_item_id TEXT
    )
  `;

  await sql`
    INSERT INTO shops (id, slug, name, upi_id)
    VALUES ('shop_1', 'sharma-kirana', 'Sharma General Store', 'sharmakirana@upi')
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    INSERT INTO customers (id, shop_id, name, phone, magic_token)
    VALUES ('cust_1', 'shop_1', 'Rahul Verma', '9876543210', 'demo-rahul-token')
    ON CONFLICT (id) DO NOTHING
  `;
}
