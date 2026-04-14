import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ ERROR: DATABASE_URL is not set.');
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function resetDB() {
    console.log(`🔌 Connecting to database...`);
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        console.log('🧹 Clearing communities (schemes and units)...');
        // Cascading deletes through schemes will wipe out units and their associated links
        await client.query('TRUNCATE TABLE scheme_units CASCADE;');
        await client.query('TRUNCATE TABLE schemes CASCADE;');

        console.log('🧹 Clearing API Integrations...');
        await client.query('TRUNCATE TABLE api_integrations CASCADE;');

        console.log('🧹 Clearing companies...');
        // Remove companies, ignoring admin seed if needed (or just truncate companies)
        // Wait, admin_users are linked to companies via company_id! 
        // If we truncate companies CASCADE, it will WIPE admin_users!
        console.log('   -> Unlinking Admin Users temporarily to prevent deletion...');
        await client.query('UPDATE admin_users SET company_id = NULL;');

        await client.query('DELETE FROM companies;'); 
        // using DELETE instead of TRUNCATE CASCADE so we don't accidentally cascade delete admin_users if FK applies

        await client.query('COMMIT');
        console.log('✅ Successfully cleared all companies and communities.');
        console.log('   Super admins have been retained completely.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to clear database:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

resetDB();
