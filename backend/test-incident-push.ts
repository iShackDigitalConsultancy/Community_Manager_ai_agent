require('dotenv').config();
import { pool } from './src/config/database';
const fetch = require('node-fetch');

async function test() {
  try {
    const credsRes = await pool.query("SELECT brand_id, client_id, client_secret, community_id FROM api_integrations WHERE company_name = 'Palladium'");
    const creds = credsRes.rows[0];
    const authHeader = 'Basic ' + Buffer.from(creds.client_id + ':' + creds.client_secret).toString('base64');
    const tokenRes = await fetch('https://smartbuildingapp.com:8443/auth/developer-key/token', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': authHeader, 'appid': creds.brand_id } });
    const token = (await tokenRes.json()).access_token;

    const payload = { category: 152, message: '[AI Escrow REF: MT-12345] Unit 28 - Maintenance test ticket', comID: creds.community_id };
    console.log('Pushing:', payload);
    const incRes = await fetch('https://api.smartbuildingapp.com/api/v1/reportIncident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-access-token': token, 'appid': creds.brand_id },
        body: JSON.stringify(payload)
    });
    console.log('Result:', await incRes.json());
  } catch(e) {
    console.log(e);
  } finally {
    pool.end();
  }
}
test();
