import { pool } from './src/config/database';
import { apiHubService } from './src/modules/api-hub/api-hub.service';
import { getBuildings, SBACredentials } from './src/modules/api-hub/smartbuilding.client';

async function test() {
    try {
        const intRes = await pool.query("SELECT * FROM api_integrations WHERE is_active = true");
        for (const intg of intRes.rows) {
            console.log(`\n=== Integration: ${intg.company_name} ===`);
            let page = 1;
            while (true) {
                const rowToCredentials = (row: any): SBACredentials => ({
                    brandId: row.brand_id, clientId: row.client_id, clientSecret: row.client_secret,
                });
                
                const { data }: any = await getBuildings(rowToCredentials(intg), page, 100);
                const buildingsArray = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
                
                if (buildingsArray.length === 0) break;
                
                for (const b of buildingsArray) {
                    console.log(`[ID: ${b.building_id}] ${b.building_name}`);
                }
                if (buildingsArray.length < 100) break;
                page++;
            }
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
test();
