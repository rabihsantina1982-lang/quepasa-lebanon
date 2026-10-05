import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BusinessProfileForm } from "@/components/BusinessProfileForm";
import { PromotionRequest } from "@/components/PromotionRequest";
import { toProfileType } from "@/lib/profileTypes";
import { isPro } from "@/lib/promotions";
import { PRICING, price } from "@/lib/pricing";
import { Calendar, Plus, Star, Sparkles, Eye, Ticket, Heart, Bell, Share2, Copy, ExternalLink, Lock, Home, Users } from "lucide-react";

export default async function PromoterDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/events`);

  // Check profile role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, business_name, logo_url, profile_type, bio, pro_until")
    .eq("id", user.id)
    .maybeSingle();

  // Check application status
  const { data: application } = await supabase
    .from("promoter_applications")
    .select("status, business_name, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  // Not a promoter yet
  if (profile?.role !== "promoter" && profile?.role !== "admin") {
    if (application?.status === "pending") {
      return (
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className="text-4xl mb-4">⏳</div>
          <h1 className="text-2xl font-bold">Application under review</h1>
          <p className="mt-3 text-[var(--color-muted)]">
            Your application for <strong>{application.business_name}</strong> is being reviewed.
            We&apos;ll notify you within 2 business days.
          </p>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="text-4xl mb-4">🎤</div>
        <h1 className="text-2xl font-bold">Become a Promoter</h1>
        <p className="mt-3 text-[var(--color-muted)]">
          List your events on QuePasa and reach thousands of people across Lebanon. Listing is free and unlimited,
          and new promoters get Pro free for their first {PRICING.proWelcomeMonths} months.
        </p>
        <Link href="/become-a-promoter">
          <Button size="lg" variant="primary" className="mt-6">Apply now</Button>
        </Link>
      </div>
    );
  }

  // Own contact details (profile_contacts) for the business profile form.
  const { data: contactsRow } = await supabase
    .from("profile_contacts")
    .select("phone, whatsapp, email, instagram, website")
    .eq("user_id", user.id)
    .maybeSingle();
  const c = (contactsRow ?? {}) as Record<string, string | null>;
  const initialContacts = {
    phone: c.phone ?? "",
    whatsapp: c.whatsapp ?? "",
    email: c.email ?? "",
    instagram: c.instagram ?? "",
    website: c.website ?? "",
  };

  // Pro: full stats, Verified badge, free boost weeks. Admins see everything.
  const pro = isPro(profile);
  const fullStats = pro || profile?.role === "admin";
  const proUntil = profile?.pro_until ? new Date(profile.pro_until) : null;

  // Get their events
  const { data: myEvents } = await supabase
    .from("events")
    .select("id, slug, title_i18n, starts_at, ends_at, status, created_at")
    .eq("source", "promoter")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const eventIds = (myEvents ?? []).map((e) => e.id);

  // Per-event stats (views, ticket clicks, saves, reminders, shares) for this
  // promoter's own events — aggregated in the database by my_event_stats().
  type EventStats = { event_id: string; views: number; views_7d: number; ticket_clicks: number; ticket_clicks_7d: number; saves: number; reminders: number; shares: number };
  const { data: statsRows } = await supabase.rpc("my_event_stats");
  const statsById = new Map(((statsRows ?? []) as EventStats[]).map((r) => [r.event_id, r]));
  const listed = (myEvents ?? []).map((ev) => statsById.get(ev.id));
  const total = (k: keyof Omit<EventStats, "event_id">) => listed.reduce((sum, r) => sum + Number(r?.[k] ?? 0), 0);

  // Audience breakdown (the database returns nothing without Pro).
  type AudienceRow = { dimension: "gender" | "age"; bucket: string; people: number };
  const { data: audienceRows } = fullStats ? await supabase.rpc("my_audience_stats") : { data: [] };
  const audience = (audienceRows ?? []) as AudienceRow[];

  // Active / upcoming promotions on their events, and their requests.
  const now = new Date();
  const { data: promotionRows } = eventIds.length
    ? await supabase.from("event_promotions").select("event_id, kind, ends_at").in("event_id", eventIds).gt("ends_at", now.toISOString())
    : { data: [] };
  const promotions = (promotionRows ?? []) as { event_id: string; kind: "boost" | "spotlight"; ends_at: string }[];
  const promotedUntil = (eventId: string, kind: "boost" | "spotlight") => {
    const ends = promotions.filter((p) => p.event_id === eventId && p.kind === kind).map((p) => new Date(p.ends_at).getTime());
    return ends.length ? new Date(Math.max(...ends)) : null;
  };

  const { data: requestRows } = await supabase
    .from("promotion_requests")
    .select("event_id, kind, status, use_free_boost, created_at")
    .eq("user_id", user.id);
  const requests = (requestRows ?? []) as { event_id: string | null; kind: string; status: string; use_free_boost: boolean; created_at: string }[];
  const isPending = (kind: string, eventId: string | null) =>
    requests.some((r) => r.status === "pending" && r.kind === kind && r.event_id === eventId);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const freeBoostsUsed = requests.filter((r) => r.use_free_boost && r.status !== "rejected" && new Date(r.created_at) >= monthStart).length;
  const freeBoostAvailable = pro && freeBoostsUsed < PRICING.proFreeBoostsPerMonth;

  const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Beirut" });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Promoter Dashboard</h1>
          <p className="text-sm text-[var(--color-muted)]">{profile?.business_name ?? application?.business_name}</p>
        </div>
        <Link href="/promoter/new-event">
          <Button size="lg" variant="primary"><Plus size={16} /> New event</Button>
        </Link>
      </div>

      {/* Plan */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-5 space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <Star size={16} className="text-[var(--color-primary)]" />
          Your plan
        </div>
        {pro ? (
          <div className="space-y-2">
            <span className="rounded-full bg-[var(--color-primary)] text-white text-xs font-bold px-3 py-1">PRO</span>
            <p className="text-sm text-[var(--color-muted)]">
              Until {fmtDate(proUntil!)} · Free boost this month: {freeBoostAvailable ? "available" : "used"}
            </p>
            <PromotionRequest kind="pro" pending={isPending("pro", null)} buttonLabel="Extend Pro" />
          </div>
        ) : profile?.role === "admin" ? (
          <p className="text-sm text-[var(--color-muted)]">Admin account: everything is unlocked.</p>
        ) : (
          <div className="space-y-2">
            <span className="rounded-full bg-[var(--color-border)] text-xs font-bold px-3 py-1">FREE</span>
            <p className="text-sm text-[var(--color-muted)]">
              Unlimited events, always free. Upgrade to Pro ({price(PRICING.proPerMonth)}/month) for full stats including
              ticket clicks and your audience, a Verified badge, and a free boost every month.
            </p>
            {proUntil && proUntil < now && (
              <p className="text-xs text-[var(--color-muted)]">Your Pro ended on {fmtDate(proUntil)}.</p>
            )}
            <PromotionRequest kind="pro" pending={isPending("pro", null)} buttonLabel="Get Pro" />
          </div>
        )}
      </div>

      {/* Visibility upsell */}
      <Link
        href="/premium"
        className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-4 hover:bg-[var(--color-primary)]/10 transition-colors"
      >
        <div className="w-9 h-9 shrink-0 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
          <Sparkles size={18} aria-hidden />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Get more people to your events</div>
          <div className="text-sm text-[var(--color-muted)]">
            Boost an event to the top of Browse ({price(PRICING.boostPerWeek)}/week) or put it in the homepage spotlight
            ({price(PRICING.spotlightPerWeek)}/week) using the buttons under each event below. See all plans.
          </div>
        </div>
      </Link>

      <BusinessProfileForm
        initialBusinessName={profile?.business_name ?? application?.business_name ?? null}
        initialLogoUrl={profile?.logo_url ?? null}
        initialType={toProfileType(profile?.profile_type)}
        initialBio={profile?.bio ?? null}
        initialContacts={initialContacts}
      />

      {/* Events list */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Calendar size={16} /> My Events
        </h2>
        {(!myEvents || myEvents.length === 0) ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] p-8 text-center">
            <p className="text-[var(--color-muted)]">You haven&apos;t posted any events yet.</p>
            <Link href="/promoter/new-event">
              <Button size="sm" variant="primary" className="mt-3"><Plus size={14} /> Post your first event</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Totals across the listed events */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <StatTile icon={<Eye size={14} />} label="Views" value={total("views")} sub={`${total("views_7d")} this week`} />
              <StatTile icon={<Heart size={14} />} label="Saves" value={total("saves")} />
              <StatTile icon={<Ticket size={14} />} label="Ticket clicks" value={total("ticket_clicks")} sub={`${total("ticket_clicks_7d")} this week`} locked={!fullStats} />
              <StatTile icon={<Bell size={14} />} label="Reminders" value={total("reminders")} locked={!fullStats} />
              <StatTile icon={<Share2 size={14} />} label="Shares" value={total("shares")} locked={!fullStats} />
            </div>

            {fullStats ? (
              <AudienceCard rows={audience} />
            ) : (
              <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-muted)] flex items-center gap-2">
                <Lock size={14} className="shrink-0" aria-hidden /> Ticket clicks, reminders, shares and your audience&apos;s age and gender are part of Pro.
              </div>
            )}

            {myEvents.map((ev) => {
              const st = statsById.get(ev.id);
              const boostUntil = promotedUntil(ev.id, "boost");
              const spotlightUntil = promotedUntil(ev.id, "spotlight");
              const over = new Date(ev.ends_at ?? ev.starts_at) < now;
              const canPromote = ev.status === "published" && !over;
              return (
                <div key={ev.id} className="rounded-[var(--radius-card)] border border-[var(--color-border)] px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{(ev.title_i18n as Record<string, string>).en ?? ev.slug}</div>
                      <div className="text-xs text-[var(--color-muted)]">{new Date(ev.starts_at).toLocaleDateString("en-GB", { timeZone: "Asia/Beirut" })}</div>
                    </div>
                    <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                      ev.status === "published" ? "bg-green-100 text-green-700" :
                      ev.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {ev.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
                    <span className="inline-flex items-center gap-1" title="Page views (views this week)"><Eye size={12} aria-hidden /> {st?.views ?? 0} views <span className="opacity-70">({st?.views_7d ?? 0} this week)</span></span>
                    <span className="inline-flex items-center gap-1"><Heart size={12} aria-hidden /> {st?.saves ?? 0} saves</span>
                    {fullStats && (
                      <>
                        <span className="inline-flex items-center gap-1" title="Clicks on Get tickets / Call to book"><Ticket size={12} aria-hidden /> {st?.ticket_clicks ?? 0} ticket clicks <span className="opacity-70">({st?.ticket_clicks_7d ?? 0} this week)</span></span>
                        <span className="inline-flex items-center gap-1"><Bell size={12} aria-hidden /> {st?.reminders ?? 0} reminders</span>
                        <span className="inline-flex items-center gap-1"><Share2 size={12} aria-hidden /> {st?.shares ?? 0} shares</span>
                      </>
                    )}
                  </div>
                  {(boostUntil || spotlightUntil) && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {boostUntil && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 font-medium">
                          <Sparkles size={12} aria-hidden /> Boosted until {fmtDate(boostUntil)}
                        </span>
                      )}
                      {spotlightUntil && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 font-medium">
                          <Home size={12} aria-hidden /> In the spotlight until {fmtDate(spotlightUntil)}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium">
                    {ev.status === "published" && (
                      <Link href={`/events/${ev.slug}`} className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline">
                        <ExternalLink size={12} aria-hidden /> View
                      </Link>
                    )}
                    <Link href={`/promoter/new-event?copy=${ev.id}`} className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline">
                      <Copy size={12} aria-hidden /> Duplicate
                    </Link>
                    {canPromote && (
                      <>
                        <PromotionRequest
                          kind="boost"
                          eventId={ev.id}
                          freeBoostAvailable={freeBoostAvailable}
                          pending={isPending("boost", ev.id)}
                          buttonLabel={boostUntil ? "Extend boost" : "Boost"}
                        />
                        <PromotionRequest
                          kind="spotlight"
                          eventId={ev.id}
                          pending={isPending("spotlight", ev.id)}
                          buttonLabel={spotlightUntil ? "Extend spotlight" : "Homepage spotlight"}
                        />
                      </>
                    )}
                  </div>
                  {ev.status === "pending" && (
                    <p className="text-xs text-[var(--color-muted)]">You can boost this event once it&apos;s approved and published.</p>
                  )}
                </div>
              );
            })}
            <p className="text-xs text-[var(--color-muted)]">
              Views count once per visitor session. Your own visits and clicks aren&apos;t counted.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const AGE_LABELS: Record<string, string> = {
  under_18: "Under 18", "18_24": "18–24", "25_34": "25–34", "35_44": "35–44", "45_plus": "45+", unknown: "Not shared",
};
const GENDER_LABELS: Record<string, string> = {
  female: "Women", male: "Men", non_binary: "Non-binary", unknown: "Not shared",
};

// Age and gender of the people who saved, set a reminder on, or clicked
// tickets for their events (counts only).
function AudienceCard({ rows }: { rows: { dimension: "gender" | "age"; bucket: string; people: number }[] }) {
  const group = (dim: "gender" | "age", labels: Record<string, string>) => {
    const items = Object.keys(labels)
      .map((k) => ({ label: labels[k], n: Number(rows.find((r) => r.dimension === dim && r.bucket === k)?.people ?? 0) }))
      .filter((i) => i.n > 0);
    return { items, sum: items.reduce((s, i) => s + i.n, 0) };
  };
  const age = group("age", AGE_LABELS);
  const gender = group("gender", GENDER_LABELS);

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3">
      <div className="text-sm font-semibold flex items-center gap-2">
        <Users size={14} aria-hidden /> Your audience
      </div>
      <p className="text-xs text-[var(--color-muted)]">People who saved, set a reminder on, or clicked tickets for your events.</p>
      {age.sum === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No signed-in visitors have interacted with your events yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {[{ title: "Age", g: age }, { title: "Gender", g: gender }].map(({ title, g }) => (
            <div key={title} className="space-y-1.5">
              <div className="text-xs text-[var(--color-muted)]">{title}</div>
              {g.items.map((i) => (
                <div key={i.label} className="flex items-center gap-2 text-xs">
                  <span className="w-20 shrink-0">{i.label}</span>
                  <span className="flex-1 h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
                    <span className="block h-full bg-[var(--color-primary)]" style={{ width: `${(i.n / g.sum) * 100}%` }} />
                  </span>
                  <span className="w-10 text-end tabular-nums">{Math.round((i.n / g.sum) * 100)}%</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({ icon, label, value, sub, locked }: { icon: React.ReactNode; label: string; value: number; sub?: string; locked?: boolean }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
      <div className="flex items-center gap-1 text-xs text-[var(--color-muted)]">{icon} {label}</div>
      {locked ? (
        <div className="mt-1 flex items-center gap-1 text-sm font-medium text-[var(--color-muted)]"><Lock size={14} aria-hidden /> Pro</div>
      ) : (
        <>
          <div className="mt-1 text-xl font-bold">{value}</div>
          {sub && <div className="text-[11px] text-[var(--color-muted)]">{sub}</div>}
        </>
      )}
    </div>
  );
}
