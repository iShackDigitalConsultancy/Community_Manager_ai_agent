import { pool } from './src/config/database';

async function testRailway() {
    try {
        const resAuth = await pool.query("SELECT token FROM admin_sessions LIMIT 1");
        const token = resAuth.rows[0]?.token;
        if (!token) return console.log("NO TOKEN");

        const compId = "9eb9331f-3ed9-4416-8151-10c184dd350d";

        const payload = {
            companyId: compId,
            brandId: "sm",
            clientId: "palladium",
            clientSecret: "123456",
            communityId: 156,
            dbIdentifier: "GUID",
            isActive: true
        };

        console.log("PAYLOAD:", payload);

        const res = await fetch("https://community-ai-manager-backend-production.up.railway.app/api/v1/admin/api-hub", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        
        console.log("STATUS:", res.status);
        console.log("RESPONSE:", await res.text());
        
    } catch(e: any) {
        console.log("FAIL:", e.message);
    } finally {
        await pool.end();
    }
}
testRailway();
