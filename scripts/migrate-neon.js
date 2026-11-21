const fs = require('fs');
const { Pool } = require('pg');

const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split('\n');
let dbUrl = '';
for (const line of lines) {
  if (line.startsWith('DATABASE_URL_UNPOOLED=') || (!dbUrl && line.startsWith('DATABASE_URL='))) {
    dbUrl = line.split('=')[1].trim().replace(/^"/, '').replace(/"$/, '');
  }
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

const schemaSql = `
-- 1. Users Table
CREATE TABLE IF NOT EXISTS users_table (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'Farmer',
  isactive BOOLEAN DEFAULT TRUE,
  theme VARCHAR(50) DEFAULT 'dark',
  language VARCHAR(10) DEFAULT 'en',
  state VARCHAR(255),
  district VARCHAR(255),
  city VARCHAR(255),
  address TEXT,
  phone_nun VARCHAR(50),
  phone_number VARCHAR(50),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Cultivation Plans Table
CREATE TABLE IF NOT EXISTS cultivation_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_completed BOOLEAN DEFAULT FALSE,
  cultivation JSONB,
  user_details JSONB,
  expense_map JSONB,
  totals JSONB
);

-- 3. Revoked Tokens Table
CREATE TABLE IF NOT EXISTS revoked_tokens (
  jti TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);

-- 4. User Session Invalidation Table
CREATE TABLE IF NOT EXISTS user_session_invalidations (
  user_id TEXT PRIMARY KEY,
  invalidated_at TIMESTAMPTZ NOT NULL
);

-- 5. Email OTP Codes Table
CREATE TABLE IF NOT EXISTS email_otp_codes (
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT DEFAULT 0
);

-- 6. Password Reset Codes Table
CREATE TABLE IF NOT EXISTS password_reset_codes (
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT DEFAULT 0
);
`;

async function migrate() {
  try {
    console.log('Running Neon schema migration...');
    await pool.query(schemaSql);
    console.log('Schema migration completed successfully.');

    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Tables in Neon database:', res.rows.map(r => r.table_name));
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    await pool.end();
    process.exit(1);
  }
}

migrate();
