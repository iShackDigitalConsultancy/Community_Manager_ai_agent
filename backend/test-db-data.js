const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://schemeassist:password@localhost:5432/schemeassist'
    });
    
    try {
        await client.connect();
        
        let res = await client.query('SELECT id, name FROM companies');
        console.log("Companies:", res.rows);
        
        res = await client.query('SELECT id, scheme_name, company_id FROM schemes');
        console.log("Schemes:", res.rows);
        
        // Let's also update the Palladium MOI document_type to 'moi'
        await client.query("UPDATE knowledge_documents SET document_type = 'moi' WHERE title ILIKE '%moi%'");
        console.log("Updated MOI document types.");
        
    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        await client.end();
    }
}
run();
