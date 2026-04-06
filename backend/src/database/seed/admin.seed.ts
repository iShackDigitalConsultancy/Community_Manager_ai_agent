import { pool } from '../../config/database';
import { logger } from '../../shared/logger';
import bcrypt from 'bcryptjs';

async function seedAdmin() {
    const client = await pool.connect();
    try {
        // Checking if the admin table exists yet (it may not if migrations haven't run)
        const email = 'wayneb@ishackventures.com';
        const passwordHash = await bcrypt.hash('123456789', 10);
        const res = await client.query('SELECT id FROM admin_users WHERE email = $1', [email]);
        if (res.rows.length === 0) {
            await client.query(`
                INSERT INTO admin_users (email, password_hash, full_name, role)
                VALUES ($1, $2, $3, $4)
            `, [email, passwordHash, 'Wayne Berger', 'super_admin']);
            logger.info('Super Admin seeded successfully.');
        } else {
            await client.query(`UPDATE admin_users SET password_hash = $1, role = 'super_admin' WHERE email = $2`, [passwordHash, email]);
            logger.info('Super Admin already exists. Updated password.');
        }
    } catch (e) {
        logger.error('Error seeding admin:', e);
    } finally {
        client.release();
    }
}

seedAdmin().then(() => process.exit(0));
