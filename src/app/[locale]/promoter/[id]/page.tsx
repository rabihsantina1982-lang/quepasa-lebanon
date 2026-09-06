import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { fetchEvents } from "@/lib/queries";
import { EventCard } from "@/components/EventCard";
import { Building2 } from "lucide-react";
import Image from "next/image";

export default async function PromoterProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: promoter } = await supabase
    .from("profiles")
    .select("business_name, logo_url, display_name, avatar_url, role")
    .eq("id", id)
    .maybeSingle();

  // Only promoters have a public profile — everyone else's row stays private
  // (profiles_public_promoter_read only exposes role='promoter' rows).
  if (!promoter || promoter.role !== "promoter") notFound();

  const name = promoter.business_name ?? promoter.display_name ?? "Organizer";
  const logo = promoter.logo_url ?? promoter.avatar_url ?? null;

  const events = await fetchEvents({ promoterId: id, limit: 50 });

  let userId: string | null = null;
  const savedIds = new Set<string>();
  try {
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

  const t = await getTranslations("PromoterProfile");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <span className="relative w-20 h-20 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)] shrink-0 flex items-center justify-center">
          {logo ? (
            <Image src={logo} alt="" fill className="object-cover" />
          ) : (
            <Building2 size={32} className="text-[var(--color-muted)]" aria-hidden />
          )}
        </span>
        <div>
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="text-sm text-[var(--color-muted)]">{t("eventsCount", { count: events.length })}</p>
        </div>
      </div>

      {events.length === 0 ? (
        <p className="text-[var(--color-muted)]">{t("noEvents")}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((ev) => (
            <EventCard key={ev.id} event={ev} locale={locale} initialSaved={savedIds.has(ev.id)} isSignedIn={!!userId} />
          ))}
        </div>
      )}
    </div>
  );
}
