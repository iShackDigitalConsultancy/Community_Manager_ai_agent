const url = 'https://community-ai-manager-backend-production.up.railway.app/api/v1/admin/debug/nuke?secret=SuperSecretNuke2026';

async function attemptWipe() {
    console.log(`Polling ${url}...`);
    try {
        const res = await fetch(url, { method: 'POST' });
        const text = await res.text();
        console.log(`Status: ${res.status}, Response: ${text}`);
        if (res.status === 200 && text.includes('cleared safely')) {
            console.log('✅ WIPE SUCCESSFUL!');
            process.exit(0);
        }
    } catch (e) {
        console.log('Fetch error:', e.message);
    }
}

async function start() {
    // Poll every 10 seconds for up to 3 minutes
    for (let i = 0; i < 18; i++) {
        await attemptWipe();
        await new Promise(r => setTimeout(r, 10000));
    }
    console.log('❌ Timeout reached. Could not wipe.');
    process.exit(1);
}

start();
