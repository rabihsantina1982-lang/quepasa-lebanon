/**
 * GET /api/cron/pro-weekly
 *
 * Weekly Vercel Cron job (vercel.json, Monday morning): emails every promoter
 * with active Pro last week's numbers for their own events
 * (src/lib/proWeeklyReport.ts). Stops by itself when Pro ends.
 *
 * Testing (CRON_SECRET required):
 *   ?preview=<promoter user id>  sends that promoter's report to the admins only
 *   ?dry=1                       sends nothing, lists who would get it
 */

import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cronAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildProReport } from "@/lib/proWeeklyReport";
import { withCronAlert } from "@/lib/alerts";

export const runtime = "nodejs";
export const maxDuration = 60;

type Profile = { id: string; email: string | null; display_name: string | null; business_name: string | null };

async function handler(req: NextRequest): Promise<Response> {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.REMINDERS_FROM_EMAIL;
  if (!resendKey || !fromEmail) {
    return NextResponse.json({ error: "RESEND_API_KEY / REMINDERS_FROM_EMAIL not set" }, { status: 500 });
  }

  const admin = createAdminClient();
  const preview = req.nextUrl.searchParams.get("preview");
  const dry = req.nextUrl.searchParams.get("dry") === "1";

  let recipients: Profile[];
  if (preview) {
    const { data } = await admin.from("profiles").select("id, email, display_name, business_name").eq("id", preview).maybeSingle();
    if (!data) return NextResponse.json({ error: "No such profile" }, { status: 404 });
    recipients = [data as Profile];
  } else {
    const { data, error } = await admin
      .from("profiles")
      .select("id, email, display_name, business_name")
      .eq("role", "promoter")
      .is("suspended_at", null)
      .gt("pro_until", new Date().toISOString());
    if (error) throw error;
    recipients = (data ?? []) as Profile[];
  }

  let adminEmails: string[] = [];
  if (preview) {
    const { data } = await admin.from("profiles").select("email").eq("role", "admin");
    adminEmails = (data ?? []).map((a) => a.email).filter((e): e is string => !!e);
  }

  let sent = 0;
  let skipped = 0;
  const failed: string[] = [];
  const wouldSend: string[] = [];
  for (const p of recipients) {
    const to = preview ? adminEmails : p.email ? [p.email] : [];
    if (to.length === 0) {
      skipped++;
      continue;
    }
    const report = await buildProReport(admin, p);
    if (report.empty && !preview) {
      skipped++;
      continue;
    }
    if (dry) {
      wouldSend.push(p.business_name ?? p.display_name ?? p.id);
      continue;
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject: preview ? `[Preview for ${p.business_name ?? p.display_name ?? "promoter"}] ${report.subject}` : report.subject,
        html: report.html,
      }),
    });
    if (res.ok) sent++;
    // While Resend has no verified domain it only delivers to the account
    // owner, so other addresses fail; those are reported, not retried.
    else failed.push(`${p.id}: ${res.status}`);
  }

  return NextResponse.json({ ok: true, recipients: recipients.length, sent, skipped, failed, ...(dry ? { wouldSend } : {}) });
}

// A crash or failure emails the admins.
export const GET = withCronAlert("pro-weekly", handler);
