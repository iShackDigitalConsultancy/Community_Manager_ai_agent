import { pool } from './src/config/database';
import bcrypt from 'bcryptjs';

async function seedTestData() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('Seeding company...');
        const compRes = await client.query(`
            INSERT INTO companies (id, name, status)
            VALUES (gen_random_uuid(), 'Test Property Management', 'active')
            RETURNING id
        `);
        const companyId = compRes.rows[0].id;

        console.log('Seeding super admin...');
        const email = 'wayneb@ishackventures.com';
        const passwordHash = await bcrypt.hash('123456789', 10);
        await client.query(`
            INSERT INTO admin_users (email, password_hash, full_name, role, company_id)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (email) DO UPDATE SET password_hash = $2, company_id = $5
        `, [email, passwordHash, 'Wayne Berger', 'super_admin', companyId]);

        console.log('Seeding 77 buildings...');
        for(let i=1; i<=77; i++) {
            const buildingName = 'Test Building ' + i;
            const codeNum = i.toString().padStart(3, '0');
            const codeStr = 'TB' + codeNum;
            await client.query(`
                INSERT INTO schemes (scheme_name, scheme_code, scheme_type, company_id, status, is_active)
                VALUES ($1, $2, 'sectional_title', $3, 'setup', true)
                ON CONFLICT (scheme_code) DO NOTHING
            `, [buildingName, codeStr, companyId]);
        }

        await client.query('COMMIT');
        console.log('Successfully seeded 77 buildings and test data.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Failed to seed testing data:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

seedTestData();
