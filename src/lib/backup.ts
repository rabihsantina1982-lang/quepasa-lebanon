// Weekly database backup: every table (found from the API schema, so new
// tables are included automatically) plus the sign-in accounts, saved as one
// gzipped JSON file in the private "backups" storage bucket. Keeps the
// newest KEEP files. Restore with scripts/restore-backup.ts.
//
// Covers mistakes and bad data (deleted rows, a broken migration). It lives
// in the same Supabase project, so it doesn't cover losing the project.

import { gzipSync } from "zlib";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export const BACKUP_BUCKET = "backups";
const KEEP = 8;
const PAGE = 1000;

async function tableNames(): Promise<string[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) throw new Error(`Schema lookup failed: ${res.status}`);
  const spec = (await res.json()) as { paths: Record<string, unknown> };
  return Object.keys(spec.paths)
    .filter((p) => /^\/[a-z0-9_]+$/.test(p))
    .map((p) => p.slice(1))
    .sort();
}

async function allRows(admin: SupabaseClient, table: string): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin.from(table).select("*").range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

async function allUsers(admin: SupabaseClient): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE });
    if (error) throw new Error(`auth users: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < PAGE) return users;
  }
}

export async function runBackup(admin: SupabaseClient): Promise<{ file: string; bytes: number; counts: Record<string, number> }> {
  const { error: bucketError } = await admin.storage.getBucket(BACKUP_BUCKET);
  if (bucketError) {
    const { error } = await admin.storage.createBucket(BACKUP_BUCKET, { public: false });
    if (error) throw new Error(`Create bucket: ${error.message}`);
  }

  const tables: Record<string, unknown[]> = {};
  for (const t of await tableNames()) tables[t] = await allRows(admin, t);
  const authUsers = await allUsers(admin);

  const body = gzipSync(JSON.stringify({ created_at: new Date().toISOString(), tables, auth_users: authUsers }));
  const file = `${new Date().toISOString().slice(0, 10)}.json.gz`;
  const { error: uploadError } = await admin.storage
    .from(BACKUP_BUCKET)
    .upload(file, body, { contentType: "application/gzip", upsert: true });
  if (uploadError) throw new Error(`Upload: ${uploadError.message}`);

  // Names are dates, so newest sort last.
  const { data: files } = await admin.storage.from(BACKUP_BUCKET).list("", { limit: 100 });
  const old = (files ?? []).map((f) => f.name).filter((n) => n.endsWith(".json.gz")).sort().slice(0, -KEEP);
  if (old.length) await admin.storage.from(BACKUP_BUCKET).remove(old);

  const counts = Object.fromEntries(Object.entries(tables).map(([t, r]) => [t, r.length]));
  return { file, bytes: body.length, counts: { ...counts, auth_users: authUsers.length } };
}
