const fs = require('fs');
const { Pool } = require('pg');

const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split('\n');
let dbUrl = '';
for (const line of lines) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.replace('DATABASE_URL=', '').trim().replace(/^"/, '').replace(/"$/, '');
    break;
  }
}

console.log('Connecting to Neon URL host:', dbUrl.split('@')[1] ? dbUrl.split('@')[1].split('/')[0] : 'unknown');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const res = await pool.query('SELECT NOW() as current_time, current_database() as db_name, version();');
    console.log('Neon Database Query Result:', res.rows[0]);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Neon Database Query Error:', err);
    await pool.end();
    process.exit(1);
  }
}

run();
