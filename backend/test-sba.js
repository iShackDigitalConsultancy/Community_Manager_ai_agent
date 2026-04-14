const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://schemeassist:password@localhost:5432/schemeassist' });
const fetch = require('node-fetch');

async function test() {
  try {
    const res = await pool.query("SELECT brand_id, client_id, client_secret, community_id FROM api_integrations WHERE id = '79e01197-6b20-46fc-b02f-630f00571234'");
    const creds = res.rows[0];
    
    const authHeader = 'Basic ' + Buffer.from(creds.client_id + ':' + creds.client_secret).toString('base64');
    const tokenRes = await fetch('https://smartbuildingapp.com:8443/auth/developer-key/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
            'appid': creds.brand_id,
        },
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.token || tokenData.access_token;
    
    console.log('Got Token:', !!token);
    
    // Now report incident
    const payload = { category: 2, message: 'Test leaking pipe', comID: creds.community_id };
    const incRes = await fetch('https://api.smartbuildingapp.com/api/v1/reportIncident', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-access-token': token,
            'appid': creds.brand_id
        },
        body: JSON.stringify(payload)
    });
    
    if (!incRes.ok) {
        console.log('Error creating incident:', incRes.status, await incRes.text());
    } else {
        console.log('Success creating incident:', await incRes.json());
    }
  } catch(e) {
    console.error('Crash:', e);
  } finally {
    pool.end();
  }
}
test();
