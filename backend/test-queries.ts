import { pool } from './src/config/database';

async function testStats() {
    try {
        console.log("Testing schemas COUNT...");
        const s = await pool.query("SELECT COUNT(*) FROM schemes WHERE is_active = true");
        console.log(s.rows);
        
        console.log("Testing units COUNT...");
        const u = await pool.query("SELECT COUNT(*) FROM scheme_units WHERE is_active = true");
        console.log(u.rows);
        
        console.log("Testing docs COUNT...");
        const d = await pool.query("SELECT COUNT(DISTINCT scheme_id) FROM knowledge_documents WHERE is_active = true");
        console.log(d.rows);
        
        console.log("Testing integrations JOIN companies...");
        const ai = await pool.query("SELECT c.name as name, ai.sync_status, ai.last_synced_at, ai.sync_error FROM api_integrations ai JOIN companies c ON ai.company_id = c.id WHERE ai.last_synced_at IS NOT NULL ORDER BY ai.last_synced_at DESC LIMIT 5");
        console.log(ai.rows);
        
        console.log("Testing complex COALESCE companies JOIN schemes...");
        const c = await pool.query(`
            SELECT c.id, c.name, COUNT(s.id) as communities_count,
                   COALESCE(
                       json_agg(json_build_object('id', s.id, 'name', s.scheme_name, 'code', s.scheme_code)) FILTER (WHERE s.id IS NOT NULL),
                       '[]'
                   ) as communities
            FROM companies c
            LEFT JOIN schemes s ON c.id = s.company_id AND s.is_active = true
            WHERE c.status = 'active'
            GROUP BY c.id, c.name
            ORDER BY c.name
        `);
        console.log(c.rows);
        
        console.log("ALL QUERIES SUCCESSFUL!");
    } catch (err: any) {
        console.error("QUERY FAILED:", err.message);
    } finally {
        await pool.end();
    }
}

testStats();
