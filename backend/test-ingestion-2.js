"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ingestion_service_1 = require("./src/modules/knowledge-base/ingestion.service");
const database_1 = require("./src/config/database");
async function run() {
    try {
        console.log("Mocking file...");
        const contentStr = "Test PDF content in plain text " + Math.random();
        const file = {
            buffer: Buffer.from(contentStr),
            mimetype: 'text/plain',
            originalname: 'test.txt'
        };
        // Fetch a real scheme UUID to use:
        const schemeRes = await database_1.pool.query('SELECT id FROM schemes LIMIT 1');
        if (schemeRes.rows.length === 0)
            throw new Error('No schemes found');
        const schemeId = schemeRes.rows[0].id;
        const adminRes = await database_1.pool.query('SELECT id FROM admin_users LIMIT 1');
        const adminId = adminRes.rows[0].id;
        console.log("Processing document...");
        const res = await ingestion_service_1.ingestionService.processDocument(schemeId, file, 'general', 'test title', adminId);
        console.log("Upload Success:", res);
    }
    catch (e) {
        console.error("Upload Error:", e);
    }
    finally {
        await database_1.pool.end();
    }
}
run();
