import { pool } from './src/config/database';
import { apiHubService } from './src/modules/api-hub/api-hub.service';
import fs from 'fs';

async function test() {
    try {
        const integrations = await apiHubService.listIntegrations();
        if (integrations.length > 0) {
            const intg = integrations[0];
            const data = await apiHubService.getBuildings(intg.id);
            fs.writeFileSync('buildings_out.json', JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}
test();
