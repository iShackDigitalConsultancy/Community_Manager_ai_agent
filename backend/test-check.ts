import { pool } from './src/config/database';

async function checkLog() {
    try {
        const res = await pool.query("SELECT id, name FROM companies WHERE name = 'Palladium'");
        console.log("Comapny:", res.rows);
        if (res.rows.length) {
            const ints = await pool.query("SELECT * FROM api_integrations WHERE company_id = $1", [res.rows[0].id]);
            console.log("Integrations:", ints.rows);
        }
    } finally {
        await pool.end();
    }
}
checkLog();
