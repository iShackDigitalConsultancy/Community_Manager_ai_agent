import { ingestionService } from './src/modules/knowledge-base/ingestion.service';
import { pool } from './src/config/database';

async function test() {
    try {
        console.log("Mocking file...");
        const file = {
            buffer: Buffer.from("This is a test pdf content"),
            mimetype: 'text/plain',
            originalname: 'test.txt'
        } as Express.Multer.File;

        console.log("Calling ingestionService...");
        const res = await ingestionService.processDocument('1', file, 'general', 'test', '1');
        console.log("Result:", res);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await pool.end();
    }
}
test();
