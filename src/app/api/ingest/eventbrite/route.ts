/**
 * POST /api/ingest/eventbrite
 *
 * Now powered by the Ticketmaster Discovery API (Eventbrite's search API
 * was shut down in 2020). Fetches live UAE events and upserts them into
 * the Supabase events table.
 *
 * Security: requires  Authorization: Bearer <CRON_SECRET>  header.
 *
 * Optional JSON body:
 *   { "maxPages": 5 }
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestFromTicketmaster } from "@/lib/ticketmaster";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // ── 1. Auth check ────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ── 2. Parse optional body ───────────────────────────────────────────────
  let body: { maxPages?: number } = {};
  try { body = await req.json().catch(() => ({})); } catch { /* no body */ }

  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TICKETMASTER_API_KEY is not set in environment variables." },
      { status: 500 }
    );
  }

  // ── 3. Log ingestion run start ───────────────────────────────────────────
  const supabase = createAdminClient();
  const { data: run } = await supabase
    .from("ingestion_runs")
    .insert({ source: "ticketmaster", started_at: new Date().toISOString() })
    .select("id")
    .maybeSingle();
  const runId = run?.id ?? null;

  // ── 4. Run ingestion ─────────────────────────────────────────────────────
  let result;
  try {
    result = await ingestFromTicketmaster(apiKey, { maxPages: body.maxPages ?? 5 });
  } catch (err) {
    const msg = String(err);
    if (runId) await supabase.from("ingestion_runs").update({ finished_at: new Date().toISOString(), inserted: 0, updated: 0, errors: msg }).eq("id", runId);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // ── 5. Log finish ────────────────────────────────────────────────────────
  if (runId) {
    await supabase.from("ingestion_runs").update({
      finished_at: new Date().toISOString(),
      inserted: result.inserted,
      updated: result.updated,
      errors: result.errors.length > 0 ? result.errors.join("\n") : null,
    }).eq("id", runId);
  }

  return NextResponse.json({
    ok: true,
    inserted: result.inserted,
    updated: result.updated,
    skipped: result.skipped,
    errors: result.errors,
  });
}

export async function GET() {
  return NextResponse.json({
    status: "Ticketmaster ingestion endpoint ready",
    ticketmaster_key_set: !!process.env.TICKETMASTER_API_KEY,
    cron_secret_set: !!process.env.CRON_SECRET,
    usage: "POST with Authorization: Bearer <CRON_SECRET> to trigger ingestion",
  });
}
