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
const jwt = __importStar(require("jsonwebtoken"));
const env_1 = require("./src/config/env");
async function run() {
    const token = jwt.sign({
        sub: 'mock-admin-id',
        email: 'wayneb@ishackventures.com',
        role: 'super_admin'
    }, env_1.env.JWT_SECRET || 'your-secure-secret-min-32-chars-xxxxxxxxx', { expiresIn: '1h' });
    console.log("Fetching Companies...");
    const companies = await fetch('http://127.0.0.1:3000/api/v1/admin/companies', {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    }).then(r => r.json());
    console.log(companies);
    console.log("\nFetching Schemes...");
    const schemes = await fetch('http://127.0.0.1:3000/api/v1/admin/schemes', {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    }).then(r => r.json());
    console.log(schemes);
}
run();
