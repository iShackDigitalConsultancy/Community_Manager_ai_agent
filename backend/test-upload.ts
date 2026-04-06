import fetch from 'node-fetch';
import * as jwt from 'jsonwebtoken';
import { env } from './src/config/env';
import FormData from 'form-data';
import { Client } from 'pg';

async function run() {
    const client = new Client({
        connectionString: env.DATABASE_URL || 'postgresql://schemeassist:password@localhost:5432/schemeassist'
    });
    
    try {
        await client.connect();
        const res = await client.query("SELECT id FROM admin_users LIMIT 1");
        const userId = res.rows[0].id;
        
        const token = jwt.sign({
            sub: userId,
            email: 'wayneb@ishackventures.com',
            role: 'super_admin',
            type: 'access'
        }, env.JWT_SECRET || 'your-secure-secret-min-32-chars-xxxxxxxxx', {expiresIn: '1h'});
        
        const schemeId = 'a7df1fc0-3757-4bbf-8805-1b40c4268ec1';
        
        const fd = new FormData();
        fd.append('file', Buffer.from('hello world test rules!'), { filename: 'testrules.txt', contentType: 'text/plain' });
        fd.append('title', 'Test Upload Hang Document');
        fd.append('document_type', 'conduct_rules');
        
        console.log("Sending POST /upload...");
        const start = Date.now();
        const response = await fetch(`http://127.0.0.1:3000/api/v1/admin/schemes/${schemeId}/knowledge/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: fd
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
