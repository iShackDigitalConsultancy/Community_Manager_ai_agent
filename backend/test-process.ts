import fetch from 'node-fetch';
import * as jwt from 'jsonwebtoken';
import { env } from './src/config/env';
import { Client } from 'pg';

async function run() {
    const client = new Client({
        connectionString: env.DATABASE_URL || 'postgresql://schemeassist:password@localhost:5432/schemeassist'
    });
    
    try {
        await client.connect();
        
        // Find a document that hasn't been processed yet
        const res = await client.query("SELECT id, scheme_id FROM knowledge_documents WHERE processing_status != 'processed' LIMIT 1");
        if (res.rows.length === 0) {
            console.log("No un-processed documents found!");
            return;
        }
        const doc = res.rows[0];
        console.log("Testing process with document:", doc.id);
        
        const adminRes = await client.query("SELECT id FROM admin_users LIMIT 1");
        const userId = adminRes.rows[0].id;
        
        const token = jwt.sign({
            sub: userId,
            email: 'wayneb@ishackventures.com',
            role: 'super_admin',
            type: 'access'
        }, env.JWT_SECRET || 'your-secure-secret-min-32-chars-xxxxxxxxx', {expiresIn: '1h'});
        
        console.log("Sending POST /process...");
        const start = Date.now();
        const response = await fetch(`http://127.0.0.1:3000/api/v1/admin/schemes/${doc.scheme_id}/knowledge/${doc.id}/process`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log("Status:", response.status, "in", Date.now() - start, "ms");
        console.log("Body:", await response.text());
        
    } catch (e) {
        console.error("Fetch threw error:", e);
    } finally {
        await client.end();
    }
}
run();
