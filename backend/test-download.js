const { Client } = require('pg');
const fetch = require('node-fetch'); // wait, fetch is built-in in node 18+
const jwt = require('jsonwebtoken');

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://schemeassist:password@localhost:5432/schemeassist'
    });
    
    try {
        await client.connect();
        const res = await client.query("SELECT id, scheme_id, original_filename FROM knowledge_documents LIMIT 1");
        if (res.rows.length === 0) {
            console.log("No documents found.");
            return;
        }
        const doc = res.rows[0];
        console.log("Testing with Doc:", doc);
        
        // Let's see what the backend actually returns! We mock authenticate.
        const token = jwt.sign({
            sub: 'mock-admin-id',
            email: 'wayneb@ishackventures.com',
            role: 'super_admin',
            type: 'access'
        }, process.env.JWT_SECRET || 'your-secure-secret-min-32-chars-xxxxxxxxx', {expiresIn: '1h'});
        
        const response = await fetch(`http://127.0.0.1:3000/api/v1/admin/schemes/${doc.scheme_id}/knowledge/${doc.id}/download`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errBody = await response.text();
            console.log("Backend error response:", response.status, errBody);
        } else {
            console.log("Download succeeded! Content-Type:", response.headers.get('content-type'));
        }
        
    } catch (err) {
        console.error("DB/Fetch Error:", err);
    } finally {
        await client.end();
    }
}
run();
