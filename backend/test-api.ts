import * as jwt from 'jsonwebtoken';
import { env } from './src/config/env';

async function run() {
    const token = jwt.sign({
        sub: 'mock-admin-id',
        email: 'wayneb@ishackventures.com',
        role: 'super_admin'
    }, env.JWT_SECRET || 'your-secure-secret-min-32-chars-xxxxxxxxx', {expiresIn: '1h'});
    
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
