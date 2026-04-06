"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const tools_registry_1 = require("./src/modules/agent/tools.registry");
const database_1 = require("./src/config/database");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function run() {
    try {
        const id = 'a7df1fc0-3757-4bbf-8805-1b40c4268ec1'; // Palladium
        console.log("Running search without doc types...");
        const res1 = await tools_registry_1.toolsRegistry.executeTool('search_knowledgebase', { query: "pet", topK: 3 }, id);
        console.log("Result 1:", res1.substring(0, 200) + "...");
        console.log("\nRunning search with doc types...");
        const res2 = await tools_registry_1.toolsRegistry.executeTool('search_knowledgebase', { query: "pet", documentTypes: ["conduct_rules", "moi"], topK: 3 }, id);
        console.log("Result 2:", res2.substring(0, 200) + "...");
    }
    catch (err) {
        console.error("Error:", err);
    }
    finally {
        await database_1.pool.end();
    }
}
run();
