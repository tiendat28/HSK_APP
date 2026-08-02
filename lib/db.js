const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL, { fullResults: true });

let schemaReady = false;

// Tao bang neu chua co. Goi ham nay o dau moi API handler.
// Idempotent - goi nhieu lan khong sao, chi thuc su chay CREATE TABLE 1 lan dau tien.
async function ensureSchema() {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS progress (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      state JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  schemaReady = true;
}

module.exports = { sql, ensureSchema };
