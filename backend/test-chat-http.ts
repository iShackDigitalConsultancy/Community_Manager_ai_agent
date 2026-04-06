import fetch from 'node-fetch';
import * as jwt from 'jsonwebtoken';
import { env } from './src/config/env';
import { Client } from 'pg';

async function run() {
    console.log("Testing POST /api/v1/chat/message for Thorntree...");
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
        
        // Use Palladium Morningside scheme ID
        const schemeId = 'a7df1fc0-3757-4bbf-8805-1b40c4268ec1';
        
        const response = await fetch(`http://127.0.0.1:3000/api/v1/chat/message`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: "what are the rules regarding parking?",
                schemeId: schemeId,
                conversationId: null
            })
        });
        
        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Response stream:", text);
        
    } catch (e) {
        console.error("Fetch threw error:", e);
    } finally {
        await client.end();
    }
}
run();
