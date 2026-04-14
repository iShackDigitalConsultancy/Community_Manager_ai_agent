import { pool } from './src/config/database';
pool.query('SELECT * FROM api_integrations').then(res => { console.log("ROWS:", res.rows); pool.end(); }).catch(e => { console.error("ERR:", e); pool.end(); });
