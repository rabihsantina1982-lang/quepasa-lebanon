/**
 * GET /api/cron/weekend-post
 *
 * Weekly Vercel Cron job (vercel.json, Thursday morning): emails every admin
 * this weekend's post kit — the caption, a preview of the image, and a link
 * to /admin/weekend-post to download the images. Posting itself stays
 * manual until the Instagram / WhatsApp Business APIs can be connected.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cronAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildWeekendPost } from "@/lib/weekendPost";

export const runtime = "nodejs";
export const maxDuration = 60;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.REMINDERS_FROM_EMAIL;
  if (!resendKey || !fromEmail) {
    return NextResponse.json({ error: "RESEND_API_KEY / REMINDERS_FROM_EMAIL not set" }, { status: 500 });
  }

  try {
    const { data: admins, error } = await createAdminClient().from("profiles").select("email").eq("role", "admin");
    if (error) throw error;
    const to = (admins ?? []).map((a) => a.email).filter((e): e is string => !!e);
    if (to.length === 0) return NextResponse.json({ ok: true, sent: 0 });

    const post = await buildWeekendPost();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const kitUrl = `${siteUrl}/en/admin/weekend-post`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject: `Weekend post ready: ${post.rangeLabel} (${post.total} events)`,
        html: `
          <p>This weekend's post is ready to share on Instagram and WhatsApp.</p>
          <p><a href="${kitUrl}"><strong>Open the post kit</strong></a> to download the images and copy the caption.</p>
          <p><strong>Caption:</strong></p>
          <pre style="white-space:pre-wrap;font-family:inherit;background:#f5f3ee;padding:12px;border-radius:8px">${escapeHtml(post.caption)}</pre>
          <p><img src="${siteUrl}/api/weekend-image?format=post" alt="This weekend" width="360" style="border-radius:8px"/></p>
        `,
      }),
    });
    if (!res.ok) throw new Error(`Resend API returned ${res.status}: ${await res.text()}`);

    return NextResponse.json({ ok: true, sent: to.length, events: post.total });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
