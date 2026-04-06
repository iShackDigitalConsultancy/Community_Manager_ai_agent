import { toolsRegistry } from './src/modules/agent/tools.registry';
import { pool } from './src/config/database';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        const id = 'a7df1fc0-3757-4bbf-8805-1b40c4268ec1'; // Palladium
        
        console.log("Running search without doc types...");
        const res1 = await toolsRegistry.executeTool('search_knowledgebase', { query: "pet", topK: 3 }, id);
        console.log("Result 1:", res1.substring(0, 200) + "...");
        
        console.log("\nRunning search with doc types...");
        const res2 = await toolsRegistry.executeTool('search_knowledgebase', { query: "pet", documentTypes: ["conduct_rules", "moi"], topK: 3 }, id);
        console.log("Result 2:", res2.substring(0, 200) + "...");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

run();
