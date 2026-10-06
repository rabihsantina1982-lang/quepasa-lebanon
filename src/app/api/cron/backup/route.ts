/**
 * GET /api/cron/backup
 *
 * Weekly by Vercel Cron (vercel.json): saves a copy of the whole database to
 * the private "backups" storage bucket (src/lib/backup.ts). Returns only
 * row counts, never data.
 *
 * Security: Vercel Cron sends  Authorization: Bearer <CRON_SECRET>.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/cronAuth";
import { runBackup } from "@/lib/backup";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await runBackup(createAdminClient())) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
