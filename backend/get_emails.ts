import { pool } from './src/config/database';

async function main() {
  const adminRes = await pool.query('SELECT email FROM admin_users LIMIT 5');
  console.log('Admin emails:', adminRes.rows);

  const tenantRes = await pool.query('SELECT tenant_email, tenant_phone FROM scheme_units LIMIT 5');
  console.log('Tenant emails:', tenantRes.rows);

  process.exit(0);
}
main();
