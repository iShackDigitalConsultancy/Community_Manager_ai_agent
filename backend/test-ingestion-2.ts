import { ingestionService } from './src/modules/knowledge-base/ingestion.service';
import { pool } from './src/config/database';
import crypto from 'crypto';

async function run() {
    try {
        console.log("Mocking file...");
        const contentStr = "Test PDF content in plain text " + Math.random();
        const file = {
            buffer: Buffer.from(contentStr),
            mimetype: 'text/plain',
            originalname: 'test.txt'
        } as Express.Multer.File;

        // Fetch a real scheme UUID to use:
        const schemeRes = await pool.query('SELECT id FROM schemes LIMIT 1');
        if (schemeRes.rows.length === 0) throw new Error('No schemes found');
        const schemeId = schemeRes.rows[0].id;

        const adminRes = await pool.query('SELECT id FROM admin_users LIMIT 1');
        const adminId = adminRes.rows[0].id;

        console.log("Processing document...");
        const res = await ingestionService.processDocument(schemeId, file, 'general', 'test title', adminId);
        console.log("Upload Success:", res);
    } catch (e) {
        console.error("Upload Error:", e);
    } finally {
        await pool.end();
    }
}
run();
