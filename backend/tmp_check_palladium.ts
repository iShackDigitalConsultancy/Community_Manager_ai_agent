import { pool } from './src/config/database';

async function test() {
    try {
        const res = await pool.query(`
            SELECT s.id as scheme_id, s.scheme_name, s.smartbuilding_property_id, 
                   ai.id as integration_id, ai.community_id as ai_community_id, ai.company_name
            FROM schemes s
            INNER JOIN api_integrations ai ON s.id::text = ai.community_id::text OR s.scheme_name ILIKE '%' || ai.company_name || '%'
            WHERE s.scheme_name ILIKE '%Palladium%'
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
test();
