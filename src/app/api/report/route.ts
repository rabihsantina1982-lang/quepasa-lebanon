/**
 * POST /api/report
 * Body: { eventId: string, reason: ReportReason, details?: string }
 * Returns: { ok: true } or { error, already?: true }
 *
 * Signed-in visitors report a problem with a published event. One open
 * report per person per event (enforced by a unique index, migration 0020).
 * At AUTO_HIDE_REPORTS open reports the event is hidden (back to draft) and
 * admins get an email; they restore or keep it hidden from /admin.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REPORT_REASONS, AUTO_HIDE_REPORTS } from "@/lib/reports";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { eventId, reason, details } = await req.json().catch(() => ({}));
  if (typeof eventId !== "string" || !REPORT_REASONS.includes(reason)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { error } = await supabase.from("event_reports").insert({
    event_id: eventId,
    user_id: user.id,
    reason,
    details: typeof details === "string" && details.trim() ? details.trim().slice(0, 1000) : null,
  });
  if (error?.code === "23505") return NextResponse.json({ error: "Already reported", already: true }, { status: 409 });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await autoHide(eventId).catch(() => {}); // the report itself is saved either way

  return NextResponse.json({ ok: true });
}

async function autoHide(eventId: string) {
  const admin = createAdminClient();
  const { count } = await admin
    .from("event_reports")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "open");
  if ((count ?? 0) < AUTO_HIDE_REPORTS) return;

  const { data: hidden } = await admin
    .from("events")
    .update({ status: "draft" })
    .eq("id", eventId)
    .eq("status", "published")
    .select("title_i18n")
    .maybeSingle();
  if (!hidden) return; // already hidden or not live

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.REMINDERS_FROM_EMAIL;
  if (!resendKey || !fromEmail) return;
  const { data: admins } = await admin.from("profiles").select("email").eq("role", "admin");
  const to = (admins ?? []).map((a) => a.email).filter((e): e is string => !!e);
  if (to.length === 0) return;
  const title = (hidden.title_i18n as Record<string, string>).en ?? Object.values(hidden.title_i18n as Record<string, string>)[0] ?? "An event";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject: `Event hidden after ${count} reports: ${title}`,
      html: `<p><strong>${title.replace(/</g, "&lt;")}</strong> was reported by ${count} people and has been taken off the site automatically.</p>
        <p><a href="${siteUrl}/en/admin">Open Admin</a> to restore it or keep it hidden.</p>`,
    }),
  });
}
