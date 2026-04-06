"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ingestion_service_1 = require("./src/modules/knowledge-base/ingestion.service");
const database_1 = require("./src/config/database");
async function test() {
    try {
        console.log("Mocking file...");
        const file = {
            buffer: Buffer.from("This is a test pdf content"),
            mimetype: 'text/plain',
            originalname: 'test.txt'
        };
        console.log("Calling ingestionService...");
        const res = await ingestion_service_1.ingestionService.processDocument('1', file, 'general', 'test', '1');
        console.log("Result:", res);
    }
    catch (e) {
        console.error("Error:", e);
    }
    finally {
        await database_1.pool.end();
    }
}
test();
