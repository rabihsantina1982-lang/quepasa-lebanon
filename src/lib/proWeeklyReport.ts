// The weekly Pro email: last week's numbers for one promoter's events, plus
// where their viewers came from (only when that covers at least 10 visits)
// and how any boost / spotlight did. Server-only.

import type { SupabaseClient } from "@supabase/supabase-js";
import { APP_TIMEZONE } from "./dates";
import { SOURCE_LABELS, LANGUAGE_LABELS, DEVICE_LABELS } from "./trafficLabels";

const SITE_NAME = "QuePasa Lebanon";

type StatRow = { event_id: string | null; metric: string; bucket: string; n: number };
type EventRow = { id: string; slug: string; title_i18n: Record<string, string>; starts_at: string; ends_at: string | null; status: string };

export interface ProReport {
  subject: string;
  html: string;
  // Nothing worth sending (no live events and no activity).
  empty: boolean;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: APP_TIMEZONE });
const change = (now: number, before: number) =>
  before > 0 ? ` (${now >= before ? "+" : ""}${Math.round(((now - before) / before) * 100)}%)` : "";

export async function buildProReport(
  admin: SupabaseClient,
  profile: { id: string; display_name: string | null; business_name: string | null },
  to = new Date()
): Promise<ProReport> {
  const from = new Date(to.getTime() - 7 * 86400000);
  const [{ data: statRows, error }, { data: eventRows }, { data: promoRows }] = await Promise.all([
    admin.rpc("pro_weekly_stats", { p_user: profile.id, p_from: from.toISOString(), p_to: to.toISOString() }),
    admin.from("events").select("id, slug, title_i18n, starts_at, ends_at, status").eq("user_id", profile.id),
    admin
      .from("event_promotions")
      .select("event_id, kind, starts_at, ends_at, events!inner(user_id)")
      .eq("events.user_id", profile.id)
      .lt("starts_at", to.toISOString())
      .gt("ends_at", from.toISOString()),
  ]);
  if (error) throw error;

  const stats = (statRows ?? []) as StatRow[];
  const events = (eventRows ?? []) as EventRow[];
  const n = (eventId: string, metric: string) => Number(stats.find((s) => s.event_id === eventId && s.metric === metric)?.n ?? 0);

  // Live upcoming events, plus any event that had activity this week.
  const active = events.filter(
    (e) => (e.status === "published" && new Date(e.ends_at ?? e.starts_at) >= from) || stats.some((s) => s.event_id === e.id)
  );
  const title = (e: EventRow) => e.title_i18n?.en ?? Object.values(e.title_i18n ?? {})[0] ?? e.slug;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const range = `${day(from)} to ${day(new Date(to.getTime() - 1))}`;
  const subject = `Your week on ${SITE_NAME}: ${range}`;

  const totals = ["views", "ticket_clicks", "saves", "reminders", "shares"].map((m) =>
    active.reduce((sum, e) => sum + n(e.id, m), 0)
  );

  const cell = "padding:6px 8px;border-bottom:1px solid #e5e2da;text-align:right";
  const eventTable = active.length
    ? `<table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr style="color:#6b6b6b;font-size:12px"><th style="text-align:left;padding:6px 8px">Event</th><th style="${cell}">Views</th><th style="${cell}">Ticket clicks</th><th style="${cell}">Saves</th><th style="${cell}">Reminders</th><th style="${cell}">Shares</th></tr>
        ${active
          .map(
            (e) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e2da"><a href="${siteUrl}/en/events/${e.slug}">${esc(title(e))}</a></td>
              <td style="${cell}">${n(e.id, "views")}</td><td style="${cell}">${n(e.id, "ticket_clicks")}</td><td style="${cell}">${n(e.id, "saves")}</td><td style="${cell}">${n(e.id, "reminders")}</td><td style="${cell}">${n(e.id, "shares")}</td></tr>`
          )
          .join("")}
      </table>`
    : "<p>You have no live events right now.</p>";

  const breakdown = (metric: string, labels: Record<string, string>) => {
    const items = stats.filter((s) => s.event_id === null && s.metric === metric).map((s) => ({ label: labels[s.bucket] ?? s.bucket, n: Number(s.n) }));
    const sum = items.reduce((t, i) => t + i.n, 0);
    return sum ? items.sort((a, b) => b.n - a.n).slice(0, 5).map((i) => `${esc(i.label)} ${Math.round((i.n / sum) * 100)}%`).join(" · ") : null;
  };
  const sources = breakdown("source", SOURCE_LABELS);
  const languages = breakdown("language", LANGUAGE_LABELS);
  const devices = breakdown("device", DEVICE_LABELS);
  const viewers =
    sources || languages || devices
      ? `<h3 style="margin:20px 0 6px">Your viewers this week</h3>
         ${sources ? `<p style="margin:4px 0"><strong>Came from:</strong> ${sources}</p>` : ""}
         ${languages ? `<p style="margin:4px 0"><strong>Language:</strong> ${languages}</p>` : ""}
         ${devices ? `<p style="margin:4px 0"><strong>Device:</strong> ${devices}</p>` : ""}`
      : `<p style="color:#6b6b6b;font-size:13px">Where your viewers come from shows here once your events get at least 10 visits in a week.</p>`;

  // Boost / spotlight results for promotions that ran during the week.
  type Promo = { event_id: string; kind: string; starts_at: string; ends_at: string };
  const promoLines: string[] = [];
  for (const p of (promoRows ?? []) as unknown as Promo[]) {
    const start = new Date(p.starts_at);
    const until = new Date(Math.min(new Date(p.ends_at).getTime(), to.getTime()));
    const before = new Date(start.getTime() - (until.getTime() - start.getTime()));
    const countKind = async (kind: string, a: Date, b: Date) => {
      const { count } = await admin
        .from("event_activity")
        .select("id", { count: "exact", head: true })
        .eq("event_id", p.event_id)
        .eq("kind", kind)
        .gte("created_at", a.toISOString())
        .lt("created_at", b.toISOString());
      return count ?? 0;
    };
    const [vd, cd, vb, cb] = await Promise.all([
      countKind("view", start, until), countKind("ticket_click", start, until), countKind("view", before, start), countKind("ticket_click", before, start),
    ]);
    const ev = events.find((e) => e.id === p.event_id);
    promoLines.push(
      `<li><strong>${p.kind === "boost" ? "Boost" : "Homepage spotlight"}</strong> for ${esc(ev ? title(ev) : "your event")} (${day(start)} to ${day(new Date(new Date(p.ends_at).getTime() - 1))}): ${vd} views vs ${vb} before${change(vd, vb)}, ${cd} ticket clicks vs ${cb}${change(cd, cb)}</li>`
    );
  }

  const name = profile.business_name ?? profile.display_name;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:640px">
      <p>Hi${name ? ` ${esc(name)}` : ""},</p>
      <p>Here's how your events did on ${SITE_NAME} last week (${range}).</p>
      <p style="font-size:15px"><strong>${totals[0]}</strong> views · <strong>${totals[1]}</strong> ticket clicks · <strong>${totals[2]}</strong> saves · <strong>${totals[3]}</strong> reminders · <strong>${totals[4]}</strong> shares</p>
      ${eventTable}
      ${viewers}
      ${promoLines.length ? `<h3 style="margin:20px 0 6px">Boost &amp; spotlight results</h3><ul style="padding-left:18px">${promoLines.join("")}</ul>` : ""}
      <p style="margin-top:20px">Tip: your ticket links carry the tag <strong>utm_source=quepasa</strong>, so your ticketing site's reports show the visits and sales that came from ${SITE_NAME}.</p>
      <p><a href="${siteUrl}/en/promoter">Open your dashboard</a> for live numbers.</p>
      <p style="color:#6b6b6b;font-size:12px;margin-top:24px">You get this email every Monday as part of ${SITE_NAME} Pro. Numbers are counted anonymously; no visitor is identified.</p>
    </div>`;

  const empty = active.length === 0 && totals.every((t) => t === 0);
  return { subject, html, empty };
}
