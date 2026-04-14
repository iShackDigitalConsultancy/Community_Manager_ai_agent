import { pool } from './src/config/database';
import { apiHubService } from './src/modules/api-hub/api-hub.service';
import { companiesService } from './src/modules/companies/companies.service';

async function run() {
    try {
        console.log("Checking DB constraints on api_integrations...");
        const consts = await pool.query(`
            SELECT conname, pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE conrelid = 'api_integrations'::regclass;
        `);
        console.log("Constraints:", consts.rows);

        console.log("Creating or updating test company...");
        
        let comp = (await pool.query("SELECT * FROM companies WHERE name='Palladium Test'")).rows[0];
        if (!comp) {
            comp = await companiesService.create({
                name: 'Palladium Test',
                status: 'active'
            });
        }
        
        console.log("Company ID:", comp.id);
        
        console.log("Fetching integrations for company...");
        const ints = await pool.query("SELECT * FROM api_integrations WHERE company_id = $1", [comp.id]);
        
        let intId = ints.rows[0]?.id;
        
        if (!ints.rows.length) {
            console.log("Creating integration...");
            const newInt = await apiHubService.createIntegration({
                companyId: comp.id,
                brandId: 'sm',
                clientId: 'palladium_community_ai',
                clientSecret: 'secret',
                communityId: 156,
                dbIdentifier: 'GUID'
            });
            intId = newInt.id;
            console.log("Integration Created:", newInt);
        }

        console.log("Updating integration...");
        const updated = await apiHubService.updateIntegration(intId, {
            brandId: 'sm',
            clientId: 'palladium_community_ai',
            clientSecret: 'secret_new',
            communityId: 156,
            dbIdentifier: 'GUID',
            isActive: true
        });
        
        console.log("Integration Updated:", updated);

    } catch (e: any) {
        console.error("FAILED:", e.message);
        if (e.detail) console.error("Detail:", e.detail);
    } finally {
        await pool.end();
    }
}

run();
