import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { fetchEventBySlug } from "@/lib/queries";
import { EventMediaCarousel } from "@/components/EventMediaCarousel";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/SaveButton";
import { RemindButton } from "@/components/RemindButton";
import { ShareButton } from "@/components/ShareButton";
import { TrackEventView } from "@/components/TrackEventView";
import { TrackedTicketLink } from "@/components/TrackedTicketLink";
import { Calendar, MapPin, Phone, Ticket, Navigation, Building2 } from "lucide-react";
import { formatDateRange, formatPrice, pickLocalized, upcomingShowtimes } from "@/lib/utils";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import Image from "next/image";
import type { Metadata } from "next";

// Link preview for WhatsApp/iMessage/Facebook etc. These "HTML-limited" bots
// get the tags in <head> (Next detects them by user agent).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const event = await fetchEventBySlug(slug);
  if (!event) return {};

  const title = pickLocalized(event.title_i18n, locale);
  const shows = upcomingShowtimes(event.showtimes);
  const when = shows.length > 1
    ? formatDateRange(shows[0].starts_at, null, locale, event.timezone)
    : formatDateRange(event.starts_at, event.ends_at, locale, event.timezone);
  const where = event.venue ? [event.venue.name, event.venue.area].filter(Boolean).join(", ") : "";
  const about = pickLocalized(event.description_i18n, locale).replace(/\s+/g, " ").trim();
  const summary = [when, where].filter(Boolean).join(" · ");
  const description = about ? `${summary} — ${about}`.slice(0, 200) : summary;

  // Resize through the image optimizer: some source photos are several MB,
  // and WhatsApp drops preview images that are too large.
  const photo = event.media.find((m) => m.kind === "image")?.url ?? event.cover_image;
  const image = photo ? `/_next/image?url=${encodeURIComponent(photo)}&w=1200&q=75` : null;

  return {
    title,
    description,
    // Nested objects replace (not merge with) the layout's openGraph, so
    // repeat the site-wide fields here.
    openGraph: {
      siteName: "QuePasa Lebanon",
      type: "website",
      title,
      description,
      url: `/${locale}/events/${slug}`,
      locale,
      ...(image ? { images: [{ url: image, width: 1200, alt: title }] } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description },
  };
}

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

  // Now we have the real event UUID — re-check favorites/reminders with the correct ID
  let initialReminded = false;
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

      const { data: reminder } = await supabase
        .from("reminders")
        .select("id")
        .eq("user_id", userId)
        .eq("event_id", event.id)
        .is("sent_at", null)
        .maybeSingle();
      initialReminded = !!reminder;
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
  const shows = upcomingShowtimes(event.showtimes);
  // The promoter's own visits and clicks shouldn't count in their stats.
  const isOwner = !!userId && userId === event.user_id;
  const publisherName = event.promoter?.business_name ?? event.promoter?.display_name ?? null;
  const publisherLogo = event.promoter?.logo_url ?? event.promoter?.avatar_url ?? null;

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
      <TrackEventView eventId={event.id} skip={isOwner} />
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
        {publisherName && event.user_id && (
          <Link
            href={`/promoter/${event.user_id}`}
            className="flex items-center gap-2 pt-1 text-sm text-[var(--color-muted)] hover:underline w-fit"
          >
            <span className="relative w-7 h-7 rounded-full overflow-hidden bg-[var(--color-card)] border border-[var(--color-border)] shrink-0 flex items-center justify-center">
              {publisherLogo ? (
                <Image src={publisherLogo} alt="" fill className="object-cover" />
              ) : (
                <Building2 size={14} aria-hidden />
              )}
            </span>
            {tDetail("postedBy")} <span className="font-medium text-[var(--color-fg)]">{publisherName}</span>
          </Link>
        )}
      </header>

      <div className="flex flex-wrap gap-2">
        {event.ticket_url ? (
          <TrackedTicketLink eventId={event.id} href={event.ticket_url} skip={isOwner}>
            <Button size="lg" variant="primary"><Ticket size={16} />{t("getTickets")}</Button>
          </TrackedTicketLink>
        ) : event.booking_phone ? (
          <TrackedTicketLink eventId={event.id} href={`tel:${event.booking_phone}`} skip={isOwner}>
            <Button size="lg" variant="primary"><Phone size={16} />{t("callToBook")}</Button>
          </TrackedTicketLink>
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
        <RemindButton eventId={event.id} initialReminded={initialReminded} isSignedIn={!!userId} />
        <ShareButton
          eventId={event.id}
          title={title}
          url={eventUrl}
          label={t("share")}
          whatsappLabel={t("shareViaWhatsapp")}
          copyLabel={t("copyLink")}
          copiedLabel={t("linkCopied")}
        />
      </div>

      {shows.length > 1 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">
            {new Set(shows.map((s) => s.starts_at)).size > 1 ? tDetail("allDates") : tDetail("ticketOptions")}
          </h2>
          <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)]">
            {shows.map((s) => (
              <li key={`${s.starts_at}-${s.ticket_url}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="inline-flex items-start gap-2">
                  <Calendar size={14} aria-hidden className="mt-0.5 shrink-0 text-[var(--color-muted)]" />
                  <span>
                    {formatDateRange(s.starts_at, null, locale, event.timezone)}
                    {s.label && <span className="block font-medium">{s.label}</span>}
                  </span>
                </span>
                {s.ticket_url && (
                  <TrackedTicketLink
                    eventId={event.id}
                    href={s.ticket_url}
                    skip={isOwner}
                    className="shrink-0 inline-flex items-center gap-1 font-medium text-[var(--color-primary)] hover:underline"
                  >
                    <Ticket size={14} aria-hidden />{t("getTickets")}
                  </TrackedTicketLink>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

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
