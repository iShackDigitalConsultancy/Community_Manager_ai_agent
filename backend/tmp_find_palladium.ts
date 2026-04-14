import { pool } from './src/config/database';
import { apiHubService } from './src/modules/api-hub/api-hub.service';
import { getBuildings, SBACredentials } from './src/modules/api-hub/smartbuilding.client';

async function test() {
    try {
        const intRes = await pool.query("SELECT * FROM api_integrations WHERE is_active = true");
        for (const intg of intRes.rows) {
            try {
                let page = 1;
                while (true) {
                    const rowToCredentials = (row: any): SBACredentials => ({
                        brandId: row.brand_id, clientId: row.client_id, clientSecret: row.client_secret,
                        cachedToken: row.token_cache || null, tokenExpires: row.token_expires ? new Date(row.token_expires) : null,
                    });
                    
                    const { data }: any = await getBuildings(rowToCredentials(intg), page, 100);
                    const buildingsArray = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
                    
                    if (buildingsArray.length === 0) break;
                    
                    for (const b of buildingsArray) {
                        if (b.building_name?.toLowerCase().includes('palladium')) {
                            console.log(`Found Palladium in integration: ${intg.company_name} (${intg.id}) | Page: ${page}`);
                            console.log(`-> Building ID: ${b.building_id}, Name: "${b.building_name}"`);
                        }
                        if (String(b.building_id) === "156") {
                            console.log(`Found building 156 in integration: ${intg.company_name} | Page: ${page}`);
                            console.log(`-> 156 is Name: "${b.building_name}"`);
                        }
                    }
                    if (buildingsArray.length < 100) break;
                    page++;
                }
            } catch(subErr) {
                // Ignore API auth errors for broken integrations
                console.error("Error for integration", intg.company_name, subErr);
            }
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
test();
