import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';

loadEnv();

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '6543', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    schema: process.env.DB_SCHEMA,
    ssl:
      process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
  });

  try {
    await ds.initialize();
    const [{ version }] = await ds.query('SELECT version()');
    const [{ current_schema }] = await ds.query('SELECT current_schema()');
    console.log('✅ Connected to Supabase Postgres');
    console.log('   server :', version);
    console.log('   schema :', process.env.DB_SCHEMA, '(current:', current_schema + ')');
    await ds.destroy();
    process.exit(0);
  } catch (e) {
    console.error('❌ Connection failed:', e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

void main();
