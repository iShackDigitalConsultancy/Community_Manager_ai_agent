import { pool } from './src/config/database';

async function save() {
    try {
        const comp = await pool.query("SELECT id FROM companies WHERE name = 'Palladium'");
        if (!comp.rows.length) {
            console.log("Palladium company not found");
            return;
        }
        const compId = comp.rows[0].id;

        const existing = await pool.query("SELECT id FROM api_integrations WHERE company_id = $1", [compId]);

        if (existing.rows.length) {
            console.log("Updating existing integration...");
            await pool.query(
                `UPDATE api_integrations SET 
                    brand_id = $1, 
                    client_id = $2, 
                    client_secret = $3, 
                    community_id = $4,
                    db_identifier = null,
                    is_active = true,
                    updated_at = NOW()
                 WHERE company_id = $5`,
                 ['sm', 'palladium_community_ai', 'suXfELZxIt-ng-d1HxyTY9Z98qCwul_w4DLJoTYNbLs', 156, compId]
            );
        } else {
            console.log("Creating new integration...");
            await pool.query(
                `INSERT INTO api_integrations (company_id, provider, brand_id, client_id, client_secret, community_id, is_active)
                 VALUES ($1, 'smartbuildingapp', $2, $3, $4, $5, true)`,
                 [compId, 'sm', 'palladium_community_ai', 'suXfELZxIt-ng-d1HxyTY9Z98qCwul_w4DLJoTYNbLs', 156]
            );
        }
        console.log("Saved successfully!");

    } catch (e: any) {
        console.error("FAIL:", e.message);
    } finally {
        await pool.end();
    }
}
save();
