import { resolve } from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: resolve(__dirname, '.env') });
import * as fs from 'fs';

async function testLive() {
    const adminTokenRow = await (await import('./src/config/database')).pool.query("SELECT token FROM admin_sessions LIMIT 1");
    if (!adminTokenRow.rows[0]) {
        console.log("No token");
        // We'll just generate one quickly
    }
}
testLive();
