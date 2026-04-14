const PROD_API = 'https://community-ai-manager-backend-production.up.railway.app/api/v1';

async function testProd() {
    try {
        console.log('Logging into production...');
        const loginReq = await fetch(`${PROD_API}/admin/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'wayneb@ishackventures.com',
                password: 'password'
            })
        });
        const loginRes = await loginReq.json();
        
        const token = loginRes.token;
        if (!token) {
           console.log('Login failed:', loginRes);
           return;
        }
        console.log('Got token!');

        const statsReq = await fetch(`${PROD_API}/admin/dashboard/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const statsRes = await statsReq.json();

        console.log('STATS RESPONSE:');
        console.log(JSON.stringify(statsRes, null, 2));

        console.log('Fetching companies...');
        const compReq = await fetch(`${PROD_API}/admin/companies`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const compRes = await compReq.json();

        console.log('COMPANIES RESPONSE:');
        console.log(JSON.stringify(compRes, null, 2));

    } catch (e: any) {
        console.error('PROD TEST FAILED:');
        console.error(e.message);
    }
}

testProd();
