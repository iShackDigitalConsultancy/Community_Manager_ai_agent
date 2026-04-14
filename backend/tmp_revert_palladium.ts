import { pool } from './src/config/database';
import { toolsRegistry } from './src/modules/agent/tools.registry';

async function test() {
    try {
        console.log("Reverting api_integrations to map Palladium to community 156...");
        await pool.query(`
            UPDATE api_integrations 
            SET community_id = 156 
            WHERE company_name ILIKE '%Palladium%'
        `);
        
        console.log("Updating schemes to reset smartbuilding_property_id...");
        await pool.query(`
            UPDATE schemes 
            SET smartbuilding_property_id = 156 
            WHERE scheme_name ILIKE '%Palladium%'
        `);

        const validSchemeIdRes = await pool.query(`
            SELECT id FROM schemes WHERE scheme_name ILIKE '%Palladium%' LIMIT 1
        `);
        
        if (validSchemeIdRes.rows.length > 0) {
            const validSchemeId = validSchemeIdRes.rows[0].id;
            console.log("Found valid scheme for testing:", validSchemeId);

            console.log("Executing tool...");
            // Run log_maintenance_request tool
            const res = await toolsRegistry.executeTool('log_maintenance_request', {
                category: 'plumbing',
                description: 'Final Test Incident Please Ignore - Testing Palladium IS restored to ID 156',
                urgency: 'low',
                unitNumber: 'A1'
            }, validSchemeId);
            console.log("Result:", res);
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
test();
