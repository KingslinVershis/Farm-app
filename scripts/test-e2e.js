const fs = require('fs');
const { Pool } = require('pg');

const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split('\n');
let dbUrl = '';
for (const line of lines) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.split('=')[1].trim().replace(/^"/, '').replace(/"$/, '');
    break;
  }
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function runE2ETests() {
  console.log('--- 1. Testing Neon Postgres Connection ---');
  const nowRes = await pool.query('SELECT NOW() as current_time, current_database() as db, version();');
  console.log('PostgreSQL Server Info:', {
    time: nowRes.rows[0].current_time,
    database: nowRes.rows[0].db,
    version: nowRes.rows[0].version.substring(0, 40) + '...',
  });

  console.log('\n--- 2. Testing Write to Neon users_table ---');
  const testEmail = `farmer_${Date.now()}@agripulse.farm`;
  const insertUser = await pool.query(
    'INSERT INTO users_table (username, email, password, role, state, district) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, role, created_at;',
    ['Thirunavukkarasu', testEmail, '$2a$12$fakehashedpassword1234567890', 'Farmer', 'Tamil Nadu', 'Thoothukkudi']
  );
  const createdUser = insertUser.rows[0];
  console.log('User created successfully in Neon:', createdUser);

  console.log('\n--- 3. Testing Write to Neon cultivation_plans ---');
  const planId = `plan_${Date.now()}`;
  const insertPlan = await pool.query(
    `INSERT INTO cultivation_plans (id, user_id, cultivation, totals) 
     VALUES ($1, $2, $3, $4) RETURNING id, user_id, created_at;`,
    [
      planId,
      String(createdUser.id),
      JSON.stringify({ crop: 'Paddy', variety: 'ADT 45', land_size: 5 }),
      JSON.stringify({ grandTotal: 45000, netProfit: 125000, roi: 277 }),
    ]
  );
  console.log('Cultivation plan created successfully in Neon:', insertPlan.rows[0]);

  console.log('\n--- 4. Testing Read / Query from Neon database ---');
  const readPlan = await pool.query(
    `SELECT u.username, u.email, p.id as plan_id, p.cultivation->>'crop' as crop, (p.totals->>'netProfit')::int as profit
     FROM users_table u
     JOIN cultivation_plans p ON u.id::text = p.user_id
     WHERE u.id = $1;`,
    [createdUser.id]
  );
  console.log('Joined query result from Neon:', readPlan.rows[0]);

  console.log('\n--- 5. Cleanup test records ---');
  await pool.query('DELETE FROM cultivation_plans WHERE id = $1;', [planId]);
  await pool.query('DELETE FROM users_table WHERE id = $1;', [createdUser.id]);
  console.log('Cleaned up test records successfully.');

  await pool.end();
  console.log('\n>>> All Neon services and database tables are verified working end-to-end! <<<');
}

runE2ETests().catch((err) => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
