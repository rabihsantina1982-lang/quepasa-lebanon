import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { fetchEventBySlug } from "@/lib/queries";
import { EventMediaCarousel } from "@/components/EventMediaCarousel";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/SaveButton";
import { ShareButton } from "@/components/ShareButton";
import { Calendar, MapPin, Phone, Ticket, Bell, Navigation } from "lucide-react";
import { formatDateRange, formatPrice, pickLocalized } from "@/lib/utils";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import Image from "next/image";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // Check auth — but do NOT redirect. Anyone can view event details.
  // We only need the user to show the correct saved state on the heart button.
  let userId: string | null = null;
  let initialSaved = false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;

    if (userId) {
      // Check if this event is already saved by the user
      const { data: fav } = await supabase
        .from("favorites")
        .select("event_id")
        .eq("user_id", userId)
        .eq("event_id", slug) // we'll fix this after fetching the event
        .maybeSingle();
      initialSaved = !!fav;
    }
  } catch {
    // Supabase not configured locally — still render the page.
  }

  const event = await fetchEventBySlug(slug);
  if (!event) notFound();

  // Now we have the real event UUID — re-check favorites with the correct ID
  if (userId && event) {
    try {
      const supabase = await createClient();
      const { data: fav } = await supabase
        .from("favorites")
        .select("event_id")
        .eq("user_id", userId)
        .eq("event_id", event.id)
        .maybeSingle();
      initialSaved = !!fav;
    } catch {
      // ignore
    }
  }

  const t = await getTranslations("Common");
  const tDetail = await getTranslations("EventDetail");

  const title = pickLocalized(event.title_i18n, locale);
  const description = pickLocalized(event.description_i18n, locale);
  const date = formatDateRange(event.starts_at, event.ends_at, locale, event.timezone);
  const price = formatPrice(event.price_min, event.price_max, event.currency, locale);

  const directionsUrl = event.venue
    ? event.venue.lat != null && event.venue.lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${event.venue.lat},${event.venue.lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          [event.venue.name, event.venue.area].filter(Boolean).join(", ")
        )}`
    : null;

  const eventUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/${locale}/events/${slug}`;

  const media = event.media.length
    ? event.media
    : event.cover_image
    ? [{ id: "cover", event_id: event.id, kind: "image" as const, url: event.cover_image, provider: "upload" as const, thumbnail_url: null, alt_i18n: null, position: 0, width: null, height: null, duration_seconds: null }]
    : [];

  return (
    <article className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {media.length > 0 && <EventMediaCarousel media={media} alt={title} />}

      <header className="space-y-2">
        <div className="text-sm text-[var(--color-muted)]">
          {event.category && pickLocalized(event.category.name_i18n, locale)}
        </div>
        <h1 className="text-2xl md:text-4xl font-bold leading-tight">{title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--color-muted)]">
          <span className="inline-flex items-center gap-1"><Calendar size={14} aria-hidden />{date}</span>
          {event.venue && (
            <span className="inline-flex items-center gap-1"><MapPin size={14} aria-hidden />{event.venue.name}{event.venue.area ? `, ${event.venue.area}` : ""}</span>
          )}
          {price && <span className="font-medium text-[var(--color-fg)]">{price}</span>}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {event.ticket_url ? (
          <a href={event.ticket_url} target="_blank" rel="noopener noreferrer">
            <Button size="lg" variant="primary"><Ticket size={16} />{t("getTickets")}</Button>
          </a>
        ) : event.booking_phone ? (
          <a href={`tel:${event.booking_phone}`}>
            <Button size="lg" variant="primary"><Phone size={16} />{t("callToBook")}</Button>
          </a>
        ) : null}
        <SaveButton eventId={event.id} initialSaved={initialSaved} isSignedIn={!!userId} />
        {directionsUrl && (
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
            <Button size="lg" variant="outline"><Navigation size={16} />{t("directions")}</Button>
          </a>
        )}
        <a href={buildGoogleCalendarUrl(event, locale)} target="_blank" rel="noopener noreferrer">
          <Button size="lg" variant="outline"><Calendar size={16} />{t("googleCalendar")}</Button>
        </a>
        <a href={`/api/ics/${event.id}`}>
          <Button size="lg" variant="outline"><Calendar size={16} />{t("appleIcs")}</Button>
        </a>
        <Button size="lg" variant="ghost"><Bell size={16} />{t("remindMe")}</Button>
        <ShareButton title={title} url={eventUrl} label={t("share")} copiedLabel={t("linkCopied")} />
      </div>

      {description && (
        <section>
          <h2 className="text-lg font-semibold mb-2">{tDetail("about")}</h2>
          <p className="whitespace-pre-line text-[var(--color-fg)]/90 leading-relaxed">{description}</p>
        </section>
      )}

      {event.venue?.lat != null && event.venue?.lng != null && (
        <section>
          <h2 className="text-lg font-semibold mb-2">{tDetail("whenWhere")}</h2>
          <div className="rounded-[var(--radius-card)] overflow-hidden border border-[var(--color-border)] aspect-[16/9] relative bg-[var(--color-card)] flex items-center justify-center text-sm text-[var(--color-muted)]">
            {process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? (
              <Image
                alt={event.venue.name}
                fill
                sizes="100vw"
                src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+0d8a8a(${event.venue.lng},${event.venue.lat})/${event.venue.lng},${event.venue.lat},14/1200x600@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
                className="object-cover"
              />
            ) : (
              <span>Map preview (set NEXT_PUBLIC_MAPBOX_TOKEN)</span>
            )}
          </div>
        </section>
      )}

      {event.source_url && (
        <p className="text-xs text-[var(--color-muted)]">
          {tDetail("source")}: <a href={event.source_url} className="underline" target="_blank" rel="noopener noreferrer">{event.source}</a>
        </p>
      )}
    </article>
  );
}
