import fs from 'fs';
import path from 'path';
import { pool } from '../config/database';
import { logger } from '../shared/logger';

async function runMigrations() {
    const client = await pool.connect();
    try {
        const migrationsDir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

        // Simple migrations table tracking
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        for (const file of files) {
            const result = await client.query('SELECT id FROM migrations WHERE filename = $1', [file]);
            if (result.rows.length === 0) {
                logger.info(`Running migration: ${file}`);
                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                
                await client.query('BEGIN');
                await client.query(sql);
                await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
                await client.query('COMMIT');
                logger.info(`Migration ${file} applied successfully.`);
            } else {
                logger.debug(`Migration ${file} already applied.`);
            }
        }
        logger.info('All database migrations applied successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error running migrations:', error);
        process.exit(1);
    } finally {
        client.release();
    }
}

runMigrations().then(() => process.exit(0));
