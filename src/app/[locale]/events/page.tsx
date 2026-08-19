import { setRequestLocale, getTranslations } from "next-intl/server";
import { EventCard } from "@/components/EventCard";
import { EventFilters } from "@/components/EventFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCategories, fetchEvents } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

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

  const categories = await fetchCategories();
  const events = await fetchEvents({
    category: sp.category,
    when: sp.when,
    search: sp.q,
    governorate: sp.governorate,
  });

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
      <EventFilters categories={categories} locale={locale} />
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
