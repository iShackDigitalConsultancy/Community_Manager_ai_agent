const fetch = require('node-fetch');

async function checkLive() {
    console.log("Checking live backend...");
    try {
        const res = await fetch("https://community-ai-manager-backend-production.up.railway.app/api/v1/admin/api-hub", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({}) // Send empty object to trigger the 400 bad request validation!
        });
        
        const text = await res.text();
        console.log("STATUS:", res.status);
        console.log("RESPONSE:", text);
    } catch(e) {
        console.log("FAIL:", e);
    }
}
checkLive();
