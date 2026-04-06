import { Pool } from 'pg';
import { env } from './env';
import { Kysely, PostgresDialect } from 'kysely';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const db = new Kysely<any>({
  dialect: new PostgresDialect({
    pool,
  }),
});
