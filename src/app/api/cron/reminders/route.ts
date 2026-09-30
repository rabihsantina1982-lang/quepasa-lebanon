/**
 * GET /api/cron/reminders
 *
 * Daily Vercel Cron job (vercel.json): emails every reminder that is due and
 * not yet sent (reminders are set for 2 days before an event, so a daily run
 * delivers them 1-2 days ahead). Replaces the Windows Task Scheduler job that
 * only ran while the owner's PC was on.
 */

import { NextRequest, NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/reminders";
import { isAuthorizedCron } from "@/lib/cronAuth";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await sendDueReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
