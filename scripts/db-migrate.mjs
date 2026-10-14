import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required; refusing to create schema without an explicit database.');
  process.exit(2);
}
const path = resolve(dirname(fileURLToPath(import.meta.url)), '../sql/schema.sql');
const sql = await readFile(path, 'utf8');
const client = new pg.Client({connectionString, connectionTimeoutMillis: 10000});
try {
  await client.connect();
  const db = await client.query('SELECT current_database() AS name');
  if (!db.rows[0]?.name) throw new Error('Cannot identify database');
  console.log('Applying isolated BookingSystem schema to database:', db.rows[0].name);
  await client.query('BEGIN');
  await client.query(sql);
  await client.query('COMMIT');
  const check = await client.query("SELECT to_regclass('public.booking_tenants') AS tenants, to_regclass('public.booking_appointments') AS appointments");
  if (!check.rows[0]?.tenants || !check.rows[0]?.appointments) throw new Error('Migration tables missing');
  console.log('BookingSystem schema verified.');
} catch (e) {
  try { await client.query('ROLLBACK'); } catch {}
  console.error('BookingSystem migration failed:', e instanceof Error ? e.message : 'unknown');
  process.exitCode = 1;
} finally {
  await client.end().catch(()=>{});
}
