import { setRequestLocale, getTranslations } from "next-intl/server";
import { EventCard } from "@/components/EventCard";
import { EventFilters } from "@/components/EventFilters";
import { SpotlightBanner } from "@/components/SpotlightBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCategories, fetchEvents } from "@/lib/queries";
import { CATEGORY_TAGS } from "@/lib/tags";
import { isPromoted } from "@/lib/promotions";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";
import { weekendRange, happensDuring, APP_TIMEZONE } from "@/lib/dates";

export default async function EventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("Empty");
  const tWeekend = await getTranslations("Weekend");
  const tFilters = await getTranslations("Filters");

  const categories = await fetchCategories();
  const inCategory = await fetchEvents({
    category: sp.category,
    when: sp.when,
    search: sp.q,
    governorate: sp.governorate,
  });

  // Sub-filters offered = those actually used by events in this category.
  const usedTags = new Set(inCategory.flatMap((e) => e.tags ?? []));
  const availableTags = sp.category ? (CATEGORY_TAGS[sp.category] ?? []).filter((tag) => usedTags.has(tag)) : [];
  const activeTag = sp.tag && availableTags.includes(sp.tag) ? sp.tag : null;
  const events = activeTag ? inCategory.filter((e) => (e.tags ?? []).includes(activeTag)) : inCategory;

  // Homepage spotlight: only on the unfiltered browse page.
  const unfiltered = !sp.category && !sp.when && !sp.q && !sp.governorate && !sp.tag;
  const spotlight = unfiltered ? events.filter((e) => isPromoted(e, "spotlight")).slice(0, 5) : [];
  const now = new Date();
  const weekend = weekendRange(now);
  const weekendCount = unfiltered
    ? events.filter((e) => happensDuring(e, { from: weekend.from > now ? weekend.from : now, to: weekend.to })).length
    : 0;

  // Check auth and fetch saved events for the current user
  let userId: string | null = null;
  const savedIds = new Set<string>();
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
    if (userId && events.length > 0) {
      const { data: favs } = await supabase
        .from("favorites")
        .select("event_id")
        .eq("user_id", userId)
        .in("event_id", events.map((e) => e.id));
      favs?.forEach((f) => savedIds.add(f.event_id));
    }
  } catch {
    // ignore — guests just see unsaved state
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-12">
      <EventFilters categories={categories} locale={locale} availableTags={availableTags} />
      <SpotlightBanner events={spotlight} locale={locale} />
      {weekendCount > 0 && (
        <Link
          href="/weekend"
          className="mt-4 flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-4 py-3 hover:bg-[var(--color-primary)]/15 transition-colors"
        >
          <span>
            <span className="font-semibold">🎉 {tFilters("thisWeekend")}</span>
            <span className="text-sm text-[var(--color-muted)]">
              {" · "}
              {new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: APP_TIMEZONE }).formatRange(weekend.from, weekend.to)}
              {" · "}
              {tWeekend("eventsCount", { count: weekendCount })}
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-[var(--color-primary)] rtl:rotate-180" aria-hidden />
        </Link>
      )}
      {events.length === 0 ? (
        <div className="py-16 text-center">
          <h2 className="text-xl font-semibold">{t("noEvents")}</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{t("tryClearing")}</p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3]" />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((ev) => (
            <EventCard key={ev.id} event={ev} locale={locale} initialSaved={savedIds.has(ev.id)} isSignedIn={!!userId} />
          ))}
        </div>
      )}
    </div>
  );
}
