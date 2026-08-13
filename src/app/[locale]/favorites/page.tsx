import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventCard } from "@/components/EventCard";
import type { EventWithRelations } from "@/lib/supabase/types";

export default async function FavoritesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tNav = await getTranslations("Nav");

  let events: EventWithRelations[] = [];
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}?signin=1&next=/${locale}/favorites`);
    const { data } = await supabase
      .from("favorites")
      .select("event:events(*, category:categories(*), venue:venues(*), media:event_media(*))")
      .eq("user_id", user.id);
    events = ((data ?? []) as unknown as Array<{ event: EventWithRelations | null }>)
      .map((row) => row.event)
      .filter((e): e is EventWithRelations => Boolean(e));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">{tNav("favorites")}</h1>
      {events.length === 0 ? (
        <p className="text-[var(--color-muted)]">No saved events yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((ev) => (
            <EventCard key={ev.id} event={ev} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
