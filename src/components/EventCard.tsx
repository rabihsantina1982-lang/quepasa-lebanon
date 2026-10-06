import { Link } from "@/i18n/navigation";
import { Video, MapPin, Building2, Sparkles, BadgeCheck } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { MediaTile } from "./MediaTile";
import { CardSaveButton } from "./CardSaveButton";
import { CardShareButton } from "./CardShareButton";
import type { EventWithRelations } from "@/lib/supabase/types";
import { formatDateRange, formatPrice, pickLocalized, upcomingShowtimes } from "@/lib/utils";
import { isPromoted, isVerified } from "@/lib/promotions";

export async function EventCard({
  event,
  locale,
  initialSaved = false,
  isSignedIn = false,
}: {
  event: EventWithRelations;
  locale: string;
  initialSaved?: boolean;
  isSignedIn?: boolean;
}) {
  const t = await getTranslations("Common");
  const title = pickLocalized(event.title_i18n, locale);
  const eventUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"}/${locale}/events/${event.slug}`;
  const hero = event.media.find((m) => m.kind === "video") ?? event.media[0];
  const hasVideo = event.media.some((m) => m.kind === "video");
  // Multi-date shows: show the next performance plus how many more dates
  // follow. Seating/package options on the same date don't count as dates.
  const shows = upcomingShowtimes(event.showtimes);
  const moreDates = new Set(shows.map((s) => s.starts_at)).size - 1;
  const date = shows.length > 1
    ? formatDateRange(shows[0].starts_at, null, locale, event.timezone) +
      (moreDates > 0 ? ` · ${t("moreDates", { count: moreDates })}` : "")
    : formatDateRange(event.starts_at, event.ends_at, locale, event.timezone);
  const price = formatPrice(event.price_min, event.price_max, event.currency, locale);
  const publisherName = event.promoter?.business_name ?? event.promoter?.display_name ?? null;
  const publisherLogo = event.promoter?.logo_url ?? event.promoter?.avatar_url ?? null;
  const featured = isPromoted(event);

  return (
    <div className={`group rounded-[var(--radius-card)] overflow-hidden bg-[var(--color-card)] border hover:shadow-lg transition-shadow ${featured ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/40" : "border-[var(--color-border)]"}`}>
      <Link href={`/events/${event.slug}`} className="block">
        <div className="relative aspect-[4/3] bg-[var(--color-border)]">
          {hero ? (
            <MediaTile media={hero} variant="card" alt={title} />
          ) : event.cover_image ? (
            <Image src={event.cover_image} alt={title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
          ) : null}
          {hasVideo && (
            <span className={`absolute ${featured ? "top-10" : "top-2"} start-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] text-white`}>
              <Video size={12} aria-hidden /> video
            </span>
          )}
          {featured && (
            <span className="absolute top-2 start-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)] px-2 py-1 text-[11px] font-semibold text-white">
              <Sparkles size={12} aria-hidden /> {t("featured")}
            </span>
          )}
          {event.category && (
            <span className="absolute top-2 end-2 rounded-full bg-white/95 px-2 py-1 text-[11px] font-medium text-neutral-900">
              {pickLocalized(event.category.name_i18n, locale)}
            </span>
          )}
          <CardSaveButton eventId={event.id} initialSaved={initialSaved} isSignedIn={isSignedIn} />
          <CardShareButton
            eventId={event.id}
            title={title}
            url={eventUrl}
            shareLabel={t("share")}
            whatsappLabel={t("shareViaWhatsapp")}
            copyLabel={t("copyLink")}
            copiedLabel={t("linkCopied")}
          />
        </div>
        <div className="p-3 space-y-1">
          <h3 className="font-semibold leading-snug line-clamp-2">{title}</h3>
          <div className="text-xs text-[var(--color-muted)]">{date}</div>
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 text-[var(--color-muted)]">
              {event.venue && (
                <>
                  <MapPin size={12} aria-hidden /> {event.venue.area ?? event.venue.name}
                </>
              )}
            </span>
            {price && <span className="font-medium">{price}</span>}
          </div>
        </div>
      </Link>
      {publisherName && event.user_id && (
        <Link
          href={`/promoter/${event.user_id}`}
          className="flex items-center gap-1.5 px-3 pb-3 text-xs text-[var(--color-muted)] hover:underline"
        >
          <span className="relative w-4 h-4 rounded-full overflow-hidden bg-[var(--color-border)] shrink-0 flex items-center justify-center">
            {publisherLogo ? (
              <Image src={publisherLogo} alt="" fill className="object-cover" />
            ) : (
              <Building2 size={10} aria-hidden />
            )}
          </span>
          {publisherName}
          {isVerified(event.promoter) && (
            <BadgeCheck size={13} className="text-[var(--color-primary)] shrink-0" aria-label={t("verified")} />
          )}
        </Link>
      )}
    </div>
  );
}
