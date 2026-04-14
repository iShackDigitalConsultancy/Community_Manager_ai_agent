import * as jwt from 'jsonwebtoken';
import { env } from './src/config/env';

async function generate() {
    const payload = {
        sub: '82791531-39b5-45c0-82af-4187b1dbd582', // Wayne's DB ID
        type: 'access',
        role: 'super_admin'
    };
    // Get JWT_SECRET
    const secret = process.env.JWT_SECRET || 'super-secret-key';
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    console.log("TOKEN:", token);
    
    // Now fetch
    const fetch = require('node-fetch');
    const res = await fetch("https://community-ai-manager-backend-production.up.railway.app/api/v1/admin/api-hub", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({}) // Trigger validation
    });
    console.log("LIVE REAL BACKEND VALIDATION STATUS:", res.status);
    console.log("LIVE REAL BACKEND VALIDATION TEXT:", await res.text());
}
generate();
