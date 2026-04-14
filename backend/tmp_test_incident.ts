import { pool } from './src/config/database';
import { toolsRegistry } from './src/modules/agent/tools.registry';

async function test() {
    try {
        const schemeRes = await pool.query(`
            SELECT s.id, s.scheme_name, s.smartbuilding_property_id 
            FROM schemes s
        `);
        let validSchemeId = null;
        for (const row of schemeRes.rows) {
             const integrationRes = await pool.query(
                `SELECT ai.id FROM api_integrations ai
                 INNER JOIN schemes s ON s.id::text = ai.community_id::text OR s.scheme_name ILIKE '%' || ai.company_name || '%'
                 WHERE s.id = $1 AND ai.is_active = true
                 LIMIT 1`,
                [row.id]
            );
            if (integrationRes.rows.length > 0) {
                validSchemeId = row.id;
                console.log("Found valid scheme for testing:", row.scheme_name);
                break;
            }
        }

        if (validSchemeId) {
            console.log("Executing tool...");
            // Run log_maintenance_request tool
            const res = await toolsRegistry.executeTool('log_maintenance_request', {
                category: 'plumbing',
                description: 'Test Incident Please Ignore',
                urgency: 'low',
                unitNumber: 'A1'
            }, validSchemeId);
            console.log("Result:", res);
        } else {
            console.log("No valid scheme found for integration testing.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}
test();
