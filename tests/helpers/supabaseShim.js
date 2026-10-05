// A tiny stand-in for what Supabase provides around our migrations, so they run in PGlite
// (real Postgres in WebAssembly): the anon / authenticated / service_role roles, auth.users,
// auth.uid() (Supabase reads the JWT's "sub" claim from request.jwt.claim.sub) and the
// storage.buckets table. Used by tests/db.test.js.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

export const SHIM = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text unique);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
`

export async function freshDatabase() {
  const db = new PGlite()
  await db.exec(SHIM)
  const dir = 'supabase/migrations'
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) await db.exec(readFileSync(join(dir, f), 'utf8'))
  return db
}

/** Runs `fn` as a Supabase role, optionally as a logged-in user (sub = their auth.users id) */
export async function asRole(db, role, sub, fn) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${role}`)
    if (sub) await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [sub])
    return fn(tx)
  })
}
