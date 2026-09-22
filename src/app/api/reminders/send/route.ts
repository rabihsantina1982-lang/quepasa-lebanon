/**
 * POST /api/reminders/send
 *
 * Scans the `reminders` table for reminders whose remind_at has passed and
 * that haven't been sent yet, emails each one via Resend, and marks it sent.
 *
 * Security: requires  Authorization: Bearer <CRON_SECRET>  header.
 */

import { NextRequest, NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/reminders";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await sendDueReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "Reminders send endpoint ready",
    resend_key_set: !!process.env.RESEND_API_KEY,
    from_email_set: !!process.env.REMINDERS_FROM_EMAIL,
    cron_secret_set: !!process.env.CRON_SECRET,
    usage: "POST with Authorization: Bearer <CRON_SECRET> to send due reminders",
  });
}
