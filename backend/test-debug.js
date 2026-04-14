const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://schemeassist:password@localhost:5432/schemeassist' });
const fetch = require('node-fetch');

async function test() {
  try {
    const schemeIdRes = await pool.query("SELECT id FROM schemes WHERE scheme_name = 'Palladium Morningside'");
    const schemeId = schemeIdRes.rows[0].id;
    console.log('Scheme ID:', schemeId);

    const integrationRes = await pool.query(
        `SELECT ai.id, ai.community_id, ai.client_id, ai.client_secret, ai.brand_id FROM api_integrations ai
         INNER JOIN schemes s ON s.id::text = ai.community_id::text OR s.scheme_name ILIKE '%' || ai.company_name || '%'
         WHERE s.id = $1 AND ai.is_active = true
         LIMIT 1`,
        [schemeId]
    );

    console.log('Integrations Found:', integrationRes.rows.length);

    if (integrationRes.rows.length > 0) {
        const creds = integrationRes.rows[0];
        console.log('Integration ID:', creds.id);

        const authHeader = 'Basic ' + Buffer.from(creds.client_id + ':' + creds.client_secret).toString('base64');
        const tokenRes = await fetch('https://smartbuildingapp.com:8443/auth/developer-key/token', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': authHeader, 'appid': creds.brand_id } });
        const token = (await tokenRes.json()).access_token;

        console.log('Fetching Categories...');
        const typeResRaw = await fetch('https://api.smartbuildingapp.com/api/v1/getReportTypes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-access-token': token, 'appid': creds.brand_id },
            body: JSON.stringify({ comID: creds.community_id })
        });
        const typesRes = await typeResRaw.json();
        
        let catId = 1;
        if (typesRes && typesRes.data && Array.isArray(typesRes.data)) {
            const maint = typesRes.data.find((c) => c.title && c.title.toLowerCase().includes('maintenance'));
            if (maint) catId = maint.id;
            else if (typesRes.data.length > 0) catId = typesRes.data[0].id;
        }
        console.log('Selected Category ID:', catId);

        console.log('Pushing to SBA...');
        const payload = { category: catId, message: `[AI Escrow - CRITICAL] Plumbing\n\nTest leaking tap final override check`, comID: creds.community_id };
        const incResRaw = await fetch('https://api.smartbuildingapp.com/api/v1/reportIncident', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-access-token': token, 'appid': creds.brand_id },
            body: JSON.stringify(payload)
        });
        const output = await incResRaw.json();
        console.log('Push Result:', output);
    }
  } catch (err) {
    console.error('ERROR OCCURRED:', err.message);
  } finally {
    pool.end();
  }
}
test();
