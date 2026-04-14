import { pool } from './src/config/database';

async function test() {
  try {
    const res = await pool.query(`INSERT INTO api_integrations (company_name, provider, brand_id, client_id, client_secret, community_id, db_identifier) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, ['test', 'smartbuildingapp', 'sm', 'id', 'secret', 164, null]);
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

test();
