import { Client } from 'pg';
import os from 'os';

async function tryConnect(connectionString: string): Promise<Client | null> {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        return client;
    } catch (e) {
        await client.end().catch(() => {});
        return null;
    }
}

async function setup() {
    const username = os.userInfo().username;
    const uris = [
        'postgresql://localhost:5432/postgres',
        'postgresql://postgres@localhost:5432/postgres',
        `postgresql://${username}@localhost:5432/${username}`,
        `postgresql://${username}@localhost:5432/postgres`
    ];

    let client: Client | null = null;
    for (const uri of uris) {
        console.log(`Trying to connect via: ${uri}`);
        client = await tryConnect(uri);
        if (client) {
            console.log(`Successfully connected via ${uri}`);
            break;
        }
    }

    if (!client) {
        console.error('Could not connect to any default administrative database. Please create the schemeassist role and database manually.');
        process.exit(1);
    }

    try {
        const roleRes = await client.query("SELECT 1 FROM pg_roles WHERE rolname='schemeassist'");
        if (roleRes.rows.length === 0) {
            await client.query("CREATE ROLE schemeassist WITH LOGIN PASSWORD 'password' SUPERUSER;");
            console.log('Created role schemeassist.');
        } else {
            console.log('Role schemeassist already exists.');
        }
        
        const dbRes = await client.query("SELECT 1 FROM pg_database WHERE datname='schemeassist'");
        if (dbRes.rows.length === 0) {
            await client.query("CREATE DATABASE schemeassist OWNER schemeassist;");
            console.log('Created database schemeassist.');
        } else {
            console.log('Database schemeassist already exists.');
        }
    } catch (error) {
        console.error('Error executing admin commands:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

setup();
