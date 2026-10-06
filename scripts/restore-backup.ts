/**
 * Look inside the weekly backups (src/lib/backup.ts) and put rows back.
 *
 * Usage:
 *   npx tsx scripts/restore-backup.ts                      list backups
 *   npx tsx scripts/restore-backup.ts make                 take a backup now
 *   npx tsx scripts/restore-backup.ts <file>               row counts per table
 *   npx tsx scripts/restore-backup.ts <file> <table>       preview restoring one table
 *   npx tsx scripts/restore-backup.ts <file> <table> --apply
 *
 * Restoring upserts by primary key: missing rows come back and changed rows
 * return to their backed-up values; rows added since the backup are left
 * alone. Restore parent tables first (e.g. venues and events before
 * event_media). Sign-in accounts (auth_users) are in the file for reference
 * but can't be restored this way.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { gunzipSync } from "zlib";
import { createClient } from "@supabase/supabase-js";
import { BACKUP_BUCKET, runBackup } from "../src/lib/backup";

function loadEnvLocal() {
  const path = join(__dirname, "..", ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

// Tables without an "id" column and their primary keys.
const KEYS: Record<string, string> = { favorites: "user_id,event_id", profile_contacts: "user_id" };

async function main() {
  loadEnvLocal();
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const [file, table, flag] = process.argv.slice(2);

  if (!file) {
    const { data, error } = await admin.storage.from(BACKUP_BUCKET).list("", { limit: 100 });
    if (error) throw error;
    for (const f of data ?? []) console.log(f.name, `${Math.round(((f.metadata?.size as number) ?? 0) / 1024)} KB`);
    return;
  }
  if (file === "make") {
    const r = await runBackup(admin);
    console.log(`Saved ${r.file} (${Math.round(r.bytes / 1024)} KB)`, r.counts);
    return;
  }

  const { data: blob, error } = await admin.storage.from(BACKUP_BUCKET).download(file);
  if (error) throw error;
  const backup = JSON.parse(gunzipSync(Buffer.from(await blob.arrayBuffer())).toString()) as {
    created_at: string;
    tables: Record<string, Record<string, unknown>[]>;
    auth_users: unknown[];
  };
  console.log(`Backup taken ${backup.created_at}`);

  if (!table) {
    for (const [t, rows] of Object.entries(backup.tables)) console.log(`  ${t.padEnd(28)} ${rows.length}`);
    console.log(`  ${"auth_users".padEnd(28)} ${backup.auth_users.length}`);
    return;
  }

  const rows = backup.tables[table];
  if (!rows) throw new Error(`No table "${table}" in this backup`);
  const { count } = await admin.from(table).select("*", { count: "exact", head: true });
  console.log(`${table}: ${rows.length} rows in backup, ${count} in the database now`);
  if (flag !== "--apply") {
    console.log("Preview only. Add --apply to restore.");
    return;
  }
  for (let i = 0; i < rows.length; i += 500) {
    const { error: e } = await admin.from(table).upsert(rows.slice(i, i + 500), { onConflict: KEYS[table] ?? "id" });
    if (e) throw new Error(`${table}: ${e.message}`);
  }
  console.log(`Restored ${rows.length} rows into ${table}.`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
