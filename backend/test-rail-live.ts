const fetch = require('node-fetch');

async function testLive() {
    console.log("Logging into live backend as admin...");
    try {
        const loginRes2 = await fetch("https://community-ai-manager-backend-production.up.railway.app/api/v1/auth/admin/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: "wayneb@ishackventures.com", password: "123456789" })
        });
        
        console.log("Login HTTP Status:", loginRes2.status);
        const loginData = await loginRes2.json();
        
        let token = loginData.accessToken;
        if (!token) return console.log("Failed to login:", loginData);

        console.log("Token obtained. Posting to api-hub to test error response...");
        const res = await fetch("https://community-ai-manager-backend-production.up.railway.app/api/v1/admin/api-hub", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({}) // Trigger 400 validation
        });
        
        console.log("STATUS:", res.status);
        console.log("RESPONSE:", await res.text());
        
    } catch(e) {
        console.log("FAIL:", e);
    }
}
testLive();
