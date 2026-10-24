import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickLocalized } from "@/lib/utils";
import { APP_TIMEZONE } from "@/lib/dates";
import { price } from "@/lib/pricing";
import { SOURCE_LABELS, LANGUAGE_LABELS, DEVICE_LABELS } from "@/lib/trafficLabels";
import { BarList, StatCard } from "../analytics/AnalyticsUI";

// Admin-only market view: visits, ticket clicks and engagement across the
// whole platform for the last 7 / 30 / 90 days. Counts only, never people.

const PERIODS = [7, 30, 90] as const;

type InsightRow = { dimension: string; bucket: string; views: number; ticket_clicks: number };
type PromoRow = {
  promotion_id: string; event_id: string; kind: "boost" | "spotlight"; starts_at: string; ends_at: string;
  views_during: number; clicks_during: number; views_before: number; clicks_before: number;
};

// "abu_dhabi" -> "Abu Dhabi"
const regionLabel = (slug: string) =>
  slug === "none" ? "Not set" : slug.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "–");
const change = (now: number, before: number) =>
  before > 0 ? `${now >= before ? "+" : ""}${Math.round(((now - before) / before) * 100)}%` : now > 0 ? "new" : "–";

export default async function AdminInsightsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const days = PERIODS.find((p) => String(p) === sp.days) ?? 30;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}?signin=1&next=/${locale}/admin/insights`);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return <div className="p-8">Admin access required.</div>;

  const admin = createAdminClient();
  const since = new Date(new Date().getTime() - days * 86400000).toISOString();
  const count = async (table: string) => {
    const { count: n } = await admin.from(table).select("*", { count: "exact", head: true }).gte("created_at", since);
    return n ?? 0;
  };

  const [{ data: insightRows }, { data: promoRows }, { data: categories }, saves, reminders, shares, signups, { data: paidRows }] = await Promise.all([
    supabase.rpc("admin_insights", { p_days: days, p_tz: APP_TIMEZONE }),
    supabase.rpc("admin_promotion_results", { p_days: days }),
    admin.from("categories").select("slug, name_i18n, icon"),
    count("favorites"),
    count("reminders"),
    count("share_events"),
    count("profiles"),
    admin.from("promotion_requests").select("amount, kind").eq("status", "approved").gte("reviewed_at", since),
  ]);

  const rows = (insightRows ?? []) as InsightRow[];
  const dim = (d: string) => rows.filter((r) => r.dimension === d).map((r) => ({ ...r, views: Number(r.views), ticket_clicks: Number(r.ticket_clicks) }));
  const total = dim("total")[0] ?? { views: 0, ticket_clicks: 0 };
  const paid = (paidRows ?? []) as { amount: number | null; kind: string }[];
  const revenue = paid.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  const catName = new Map((categories ?? []).map((c) => [c.slug, `${c.icon ?? ""} ${pickLocalized(c.name_i18n, "en")}`.trim()]));
  const bars = (d: string, label: (b: string) => string, by: "views" | "ticket_clicks" = "views") =>
    dim(d)
      .map((r) => ({ label: label(r.bucket), count: r[by] }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count);

  const daysList = dim("day").sort((a, b) => a.bucket.localeCompare(b.bucket));
  const dayBars = daysList.map((r) => ({
    label: new Date(`${r.bucket}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }),
    count: r.views,
  }));

  // Top events by views, with their titles.
  const top = dim("event").sort((a, b) => b.views - a.views).slice(0, 10);
  const promos = (promoRows ?? []) as PromoRow[];
  const ids = [...new Set([...top.map((t) => t.bucket), ...promos.map((p) => p.event_id)])];
  const { data: evRows } = ids.length ? await admin.from("events").select("id, slug, title_i18n").in("id", ids) : { data: [] };
  const titleOf = new Map(((evRows ?? []) as { id: string; slug: string; title_i18n: Record<string, string> }[]).map((e) => [e.id, { title: pickLocalized(e.title_i18n, "en") || e.slug, slug: e.slug }]));
  const fmt = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: APP_TIMEZONE });

  const chip = (on: boolean) => `px-3 py-1.5 rounded-full text-sm ${on ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border)] hover:bg-[var(--color-card)]"}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-10">
      <nav className="flex gap-2 text-sm">
        <Link href="/admin" className="px-3 py-1.5 rounded-full hover:bg-[var(--color-card)]">Queue</Link>
        <Link href="/admin/insights" className="px-3 py-1.5 rounded-full bg-[var(--color-card)] font-medium">Insights</Link>
        <Link href="/admin/analytics" className="px-3 py-1.5 rounded-full hover:bg-[var(--color-card)]">Analytics</Link>
        <Link href="/admin/weekend-post" className="px-3 py-1.5 rounded-full hover:bg-[var(--color-card)]">Weekly post</Link>
      </nav>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Market insights</h1>
            <p className="text-sm text-[var(--color-muted)]">
              Visits to event pages and clicks on ticket links across QuePasa. Counts only; no one is identifiable. Admins only.
            </p>
          </div>
          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <Link key={p} href={`/admin/insights?days=${p}`} className={chip(p === days)}>Last {p} days</Link>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Event page views" value={total.views} />
          <StatCard label="Ticket / booking clicks" value={total.ticket_clicks} />
          <StatCard label="Click rate (clicks ÷ views)" value={pct(total.ticket_clicks, total.views)} />
          <StatCard label="Saves" value={saves} />
          <StatCard label="Reminders set" value={reminders} />
          <StatCard label="Shares" value={shares} />
          <StatCard label="New accounts" value={signups} />
          <StatCard label={`Paid promotions (${paid.length})`} value={price(revenue)} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Views per day</h2>
        <BarList items={dayBars} emptyLabel="No visits recorded in this period." />
      </section>

      <div className="grid sm:grid-cols-2 gap-8">
        <section>
          <h2 className="text-lg font-semibold mb-3">Views by category</h2>
          <BarList items={bars("category", (b) => catName.get(b) ?? (b === "none" ? "No category" : b))} emptyLabel="No data yet." />
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-3">Ticket clicks by category</h2>
          <BarList items={bars("category", (b) => catName.get(b) ?? (b === "none" ? "No category" : b), "ticket_clicks")} emptyLabel="No ticket clicks yet." />
        </section>
      </div>

      <div className="grid sm:grid-cols-2 gap-8">
        <section>
          <h2 className="text-lg font-semibold mb-3">Views by region</h2>
          <BarList items={bars("region", regionLabel)} emptyLabel="No data yet." />
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-3">Where visitors come from</h2>
          <BarList items={bars("source", (b) => SOURCE_LABELS[b] ?? b)} emptyLabel="No sources recorded yet (tracking started 25 Oct 2026)." />
        </section>
      </div>

      <div className="grid sm:grid-cols-2 gap-8">
        <section>
          <h2 className="text-lg font-semibold mb-3">Language they browse in</h2>
          <BarList items={bars("language", (b) => LANGUAGE_LABELS[b] ?? b)} emptyLabel="No data yet." />
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-3">Device</h2>
          <BarList items={bars("device", (b) => DEVICE_LABELS[b] ?? b)} emptyLabel="No devices recorded yet (tracking started 25 Oct 2026)." />
        </section>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Top events</h2>
        {top.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No visits recorded in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-start text-xs text-[var(--color-muted)]">
                <tr><th className="text-start py-1">Event</th><th className="text-end">Views</th><th className="text-end">Ticket clicks</th><th className="text-end">Click rate</th></tr>
              </thead>
              <tbody>
                {top.map((t) => {
                  const ev = titleOf.get(t.bucket);
                  return (
                    <tr key={t.bucket} className="border-t border-[var(--color-border)]">
                      <td className="py-1.5 pe-3">
                        {ev ? <a href={`/en/events/${ev.slug}`} target="_blank" rel="noopener noreferrer" className="underline">{ev.title}</a> : "Deleted event"}
                      </td>
                      <td className="text-end tabular-nums">{t.views}</td>
                      <td className="text-end tabular-nums">{t.ticket_clicks}</td>
                      <td className="text-end tabular-nums">{pct(t.ticket_clicks, t.views)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Boost &amp; spotlight results</h2>
        <p className="text-xs text-[var(--color-muted)] mb-2">Each promotion compared with the same number of days just before it started.</p>
        {promos.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No boosts or spotlights ran in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-[var(--color-muted)]">
                <tr><th className="text-start py-1">Event</th><th className="text-start">Type</th><th className="text-start">Dates</th><th className="text-end">Views (before)</th><th className="text-end">Change</th><th className="text-end">Clicks (before)</th><th className="text-end">Change</th></tr>
              </thead>
              <tbody>
                {promos.map((p) => (
                  <tr key={p.promotion_id} className="border-t border-[var(--color-border)]">
                    <td className="py-1.5 pe-3">{titleOf.get(p.event_id)?.title ?? "Deleted event"}</td>
                    <td>{p.kind === "boost" ? "Boost" : "Spotlight"}</td>
                    <td className="whitespace-nowrap">{fmt(p.starts_at)} – {fmt(new Date(new Date(p.ends_at).getTime() - 1).toISOString())}</td>
                    <td className="text-end tabular-nums">{Number(p.views_during)} ({Number(p.views_before)})</td>
                    <td className="text-end tabular-nums">{change(Number(p.views_during), Number(p.views_before))}</td>
                    <td className="text-end tabular-nums">{Number(p.clicks_during)} ({Number(p.clicks_before)})</td>
                    <td className="text-end tabular-nums">{change(Number(p.clicks_during), Number(p.clicks_before))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
