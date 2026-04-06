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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const jwt = __importStar(require("jsonwebtoken"));
const env_1 = require("./src/config/env");
const pg_1 = require("pg");
async function run() {
    const client = new pg_1.Client({
        connectionString: env_1.env.DATABASE_URL || 'postgresql://schemeassist:password@localhost:5432/schemeassist'
    });
    try {
        await client.connect();
        // Find a document that hasn't been processed yet
        const res = await client.query("SELECT id, scheme_id FROM knowledge_documents WHERE processing_status != 'processed' LIMIT 1");
        if (res.rows.length === 0) {
            console.log("No un-processed documents found!");
            return;
        }
        const doc = res.rows[0];
        console.log("Testing process with document:", doc.id);
        const adminRes = await client.query("SELECT id FROM admin_users LIMIT 1");
        const userId = adminRes.rows[0].id;
        const token = jwt.sign({
            sub: userId,
            email: 'wayneb@ishackventures.com',
            role: 'super_admin',
            type: 'access'
        }, env_1.env.JWT_SECRET || 'your-secure-secret-min-32-chars-xxxxxxxxx', { expiresIn: '1h' });
        console.log("Sending POST /process...");
        const start = Date.now();
        const response = await (0, node_fetch_1.default)(`http://127.0.0.1:3000/api/v1/admin/schemes/${doc.scheme_id}/knowledge/${doc.id}/process`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log("Status:", response.status, "in", Date.now() - start, "ms");
        console.log("Body:", await response.text());
    }
    catch (e) {
        console.error("Fetch threw error:", e);
    }
    finally {
        await client.end();
    }
}
run();
