/**
 * GET /api/cron/health
 *
 * Daily health check (Vercel Cron, vercel.json). Emails the admins only if
 * something is wrong: the site doesn't load, the database doesn't answer,
 * there are no upcoming events, the weekly backup is missing or old, or the
 * Ticketmaster import hasn't run / failed.
 * Security: Vercel Cron sends  Authorization: Bearer <CRON_SECRET>.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cronAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { alertAdmins } from "@/lib/alerts";

export const runtime = "nodejs";

const HOUR = 3600 * 1000;
// Which automatic imports this app runs, checked in ingestion_runs.
const IMPORTS: string[] = []; // Lebanon has no automatic import (Ticketmaster lists no Lebanon events)

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const problems: string[] = [];
  const admin = createAdminClient();
  const now = Date.now();

  // 1. Database answers, and the site has upcoming events.
  const { count, error: dbError } = await admin
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .gte("starts_at", new Date(now).toISOString());
  if (dbError) problems.push(`Database didn't answer: ${dbError.message}`);
  else if (!count) problems.push("No upcoming events are published: the events page is empty.");

  // 2. The events page loads.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl && !siteUrl.includes("localhost")) {
    try {
      const res = await fetch(`${siteUrl}/en/events`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
      if (!res.ok) problems.push(`The events page answered with error ${res.status}.`);
    } catch (e) {
      problems.push(`The events page didn't load: ${(e as Error).message}`);
    }
  }

  // 3. Weekly backup exists and is less than 8 days old.
  const { data: files, error: bErr } = await admin.storage.from("backups").list("", { limit: 100 });
  const newest = (files ?? []).filter((f) => f.name.endsWith(".json.gz")).map((f) => new Date(f.created_at ?? 0).getTime()).sort().pop();
  if (bErr) problems.push(`Couldn't check backups: ${bErr.message}`);
  else if (!newest) problems.push("No backup file found.");
  else if (now - newest > 8 * 24 * HOUR) problems.push(`Newest backup is ${Math.floor((now - newest) / (24 * HOUR))} days old (should be weekly).`);

  // 4. Automatic imports ran in the last 30 hours without errors.
  for (const source of IMPORTS) {
    const { data: run } = await admin
      .from("ingestion_runs")
      .select("started_at, finished_at, errors")
      .eq("source", source)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!run) problems.push(`The ${source} import has never run.`);
    else if (now - new Date(run.started_at).getTime() > 30 * HOUR) problems.push(`The ${source} import last ran ${new Date(run.started_at).toUTCString()}.`);
    else if (run.errors) problems.push(`The last ${source} import had errors: ${String(run.errors).slice(0, 300)}`);
    else if (!run.finished_at) problems.push(`The last ${source} import never finished.`);
  }

  // ?test=1 sends a sample alert, to check the emails arrive.
  if (req.nextUrl.searchParams.get("test") === "1") {
    await alertAdmins("health-test", "Test alert: error emails work", "This is a test. Nothing is wrong.\n\n" + (problems.length ? problems.join("\n") : "Daily check: all fine."));
  }

  if (problems.length) {
    await alertAdmins("health",`Daily check found ${problems.length} problem(s)`, problems.map((p) => `- ${p}`).join("\n"));
  }
  return NextResponse.json({ ok: problems.length === 0, problems, upcoming: count ?? null });
}
