require('dotenv').config();
import { pool } from './src/config/database';
import { apiHubService } from './src/modules/api-hub/api-hub.service';

async function test() {
  try {
    const schemeIdRes = await pool.query("SELECT id FROM schemes WHERE scheme_name = 'Palladium Morningside'");
    const schemeId = schemeIdRes.rows[0].id;
    console.log('Scheme ID:', schemeId);

    const integrationRes = await pool.query(
        `SELECT ai.id FROM api_integrations ai
         INNER JOIN schemes s ON s.id::text = ai.community_id::text OR s.scheme_name ILIKE '%' || ai.company_name || '%'
         WHERE s.id = $1 AND ai.is_active = true
         LIMIT 1`,
        [schemeId]
    );

    console.log('Integrations Found:', integrationRes.rows.length);

    if (integrationRes.rows.length > 0) {
        const integrationId = integrationRes.rows[0].id;
        console.log('Integration ID:', integrationId);

        console.log('Fetching Categories...');
        const typesRes = await apiHubService.getReportTypesProxy(integrationId);
        let catId = 1;
        if (typesRes && typesRes.data && Array.isArray(typesRes.data)) {
            const maint = typesRes.data.find((c: any) => c.title && c.title.toLowerCase().includes('maintenance'));
            if (maint) catId = maint.id;
            else if (typesRes.data.length > 0) catId = typesRes.data[0].id;
        }
        console.log('Selected Category ID:', catId);

        console.log('Pushing to SBA...');
        const output = await apiHubService.reportIncidentProxy(integrationId, {
            category: catId, 
            message: `[AI Escrow - CRITICAL] Plumbing\n\nTest leaking tap check`
        });
        console.log('Push Result:', output);
    }
  } catch (err: any) {
    console.error('ERROR OCCURRED:', err.message);
  } finally {
    pool.end();
  }
}
test();
