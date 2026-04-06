const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://schemeassist:password@localhost:5432/schemeassist'
    });
    
    try {
        await client.connect();
        const res = await client.query(`
            SELECT count(*) 
            FROM knowledge_chunks c 
            JOIN schemes s ON c.scheme_id = s.id 
            WHERE s.scheme_name ILIKE '%palladium%'
        `);
        console.log("Palladium knowledge chunks count:", res.rows[0].count);
    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        await client.end();
    }
}

run();
