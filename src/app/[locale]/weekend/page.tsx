import { setRequestLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { fetchEvents } from "@/lib/queries";
import { weekendRange, weekendDays, happensDuring, APP_TIMEZONE, type Range } from "@/lib/dates";
import { governorateChips } from "@/lib/regions";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { EventWithRelations } from "@/lib/supabase/types";

const REGION_PARAM = "governorate";
const REGIONS = governorateChips;
const ALL_REGIONS_KEY = "allLebanon";
const SITE_NAME = "QuePasa Lebanon";

// "Fri 9 – Sun 11 Oct"
function rangeLabel(r: Range, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: APP_TIMEZONE }).formatRange(r.from, r.to);
}

type Params = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const { locale } = await params;
  const region = (await searchParams)[REGION_PARAM];
  const tFilters = await getTranslations({ locale, namespace: "Filters" });
  const t = await getTranslations({ locale, namespace: "Weekend" });
  const count = (await fetchEvents({ when: "thisWeekend", [REGION_PARAM]: region })).length;
  const title = `${tFilters("thisWeekend")} · ${rangeLabel(weekendRange(), locale)}`;
  const description = t("eventsCount", { count });
  return {
    title,
    description,
    openGraph: { siteName: SITE_NAME, type: "website", title, description, url: `/${locale}/weekend${region ? `?${REGION_PARAM}=${region}` : ""}`, locale },
  };
}

export default async function WeekendPage({ params, searchParams }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const region = (await searchParams)[REGION_PARAM];
  const t = await getTranslations("Weekend");
  const tFilters = await getTranslations("Filters");

  const events = await fetchEvents({ when: "thisWeekend", [REGION_PARAM]: region });

  // Days still to come (on Saturday, Friday is gone); today counts from now.
  const now = new Date();
  const days = weekendDays(now)
    .filter((d) => d.to > now)
    .map((d) => ({ ...d, from: d.from > now ? d.from : now, isToday: d.from <= now }));

  // Exhibitions, festivals etc. running through every remaining day get one
  // "all weekend" list instead of repeating under each day.
  const isOngoing = (e: EventWithRelations) =>
    !(e.showtimes && e.showtimes.length > 1) &&
    !!e.ends_at &&
    new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime() > 86400000 &&
    days.every((d) => happensDuring(e, d));
  const ongoing = events.filter(isOngoing);
  const sections = days
    .map((d) => ({ ...d, events: events.filter((e) => !isOngoing(e) && happensDuring(e, d)) }))
    .filter((s) => s.events.length > 0);

  let userId: string | null = null;
  const savedIds = new Set<string>();
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
    if (userId && events.length > 0) {
      const { data: favs } = await supabase.from("favorites").select("event_id").eq("user_id", userId).in("event_id", events.map((e) => e.id));
      favs?.forEach((f) => savedIds.add(f.event_id));
    }
  } catch {
    // guests just see unsaved state
  }

  const pageUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/${locale}/weekend${region ? `?${REGION_PARAM}=${region}` : ""}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${t("shareText")}\n${pageUrl}`)}`;
  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: APP_TIMEZONE });

  const grid = (list: EventWithRelations[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map((ev) => (
        <EventCard key={ev.id} event={ev} locale={locale} initialSaved={savedIds.has(ev.id)} isSignedIn={!!userId} />
      ))}
    </div>
  );

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full px-3 h-8 inline-flex items-center text-xs border transition-colors",
      active ? "bg-[var(--color-fg)] text-[var(--color-bg)] border-[var(--color-fg)]" : "bg-transparent border-[var(--color-border)]"
    );

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-12 space-y-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">🎉 {tFilters("thisWeekend")}</h1>
            <p className="mt-1 text-[var(--color-muted)]">
              {rangeLabel(weekendRange(now), locale)} · {t("eventsCount", { count: events.length })}
            </p>
          </div>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">💬 {t("share")}</Button>
          </a>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label={tFilters("area")}>
          <Link href="/weekend" className={chip(!region)}>{tFilters(ALL_REGIONS_KEY)}</Link>
          {REGIONS.map(({ slug, key }) => (
            <Link key={slug} href={`/weekend?${REGION_PARAM}=${slug}`} className={chip(region === slug)}>{tFilters(key)}</Link>
          ))}
        </nav>
      </header>

      {events.length === 0 ? (
        <div className="py-16 text-center space-y-4">
          <p className="text-lg">{t("empty")}</p>
          <Link href="/events"><Button variant="primary">{t("browseAll")}</Button></Link>
        </div>
      ) : (
        <>
          {sections.map((s) => (
            <section key={s.to.toISOString()}>
              <h2 className="text-xl font-semibold mb-3">
                {s.isToday && <span className="text-[var(--color-accent)]">{tFilters("today")} · </span>}
                {dayFmt.format(s.to)}
              </h2>
              {grid(s.events)}
            </section>
          ))}
          {ongoing.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-1">{t("allWeekend")}</h2>
              <p className="text-sm text-[var(--color-muted)] mb-3">{t("allWeekendHint")}</p>
              {grid(ongoing)}
            </section>
          )}
          <div className="text-center">
            <Link href="/events"><Button variant="outline">{t("browseAll")}</Button></Link>
          </div>
        </>
      )}
    </div>
  );
}
