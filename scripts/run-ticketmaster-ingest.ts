/**
 * Standalone runner for the Ticketmaster ingestion, meant to be triggered by
 * Windows Task Scheduler (or any external scheduler) without the Next.js dev
 * server needing to be running. Talks directly to Supabase + Ticketmaster.
 *
 * Usage: npx tsx scripts/run-ticketmaster-ingest.ts
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { createAdminClient } from "../src/lib/supabase/admin";
import { ingestFromTicketmaster } from "../src/lib/ticketmaster";

function loadEnvLocal() {
  const path = join(__dirname, "..", ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

async function main() {
  loadEnvLocal();

  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    console.error("TICKETMASTER_API_KEY is not set in .env.local");
    process.exit(1);
  }

  const supabase = createAdminClient();
  const { data: run } = await supabase
    .from("ingestion_runs")
    .insert({ source: "ticketmaster", started_at: new Date().toISOString() })
    .select("id")
    .maybeSingle();
  const runId = run?.id ?? null;

  console.log(`[${new Date().toISOString()}] Starting Ticketmaster ingestion...`);

  try {
    const result = await ingestFromTicketmaster(apiKey, { maxPages: 5 });

    if (runId) {
      await supabase.from("ingestion_runs").update({
        finished_at: new Date().toISOString(),
        inserted: result.inserted,
        updated: result.updated,
        errors: result.errors.length > 0 ? result.errors.join("\n") : null,
      }).eq("id", runId);
    }

    console.log(
      `[${new Date().toISOString()}] Done. Inserted: ${result.inserted}, ` +
      `Updated: ${result.updated}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`
    );
    if (result.errors.length > 0) console.error(result.errors.join("\n"));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Ingestion failed:`, err);
    if (runId) {
      await supabase.from("ingestion_runs").update({
        finished_at: new Date().toISOString(),
        inserted: 0,
        updated: 0,
        errors: String(err),
      }).eq("id", runId);
    }
    process.exit(1);
  }
}

main();
