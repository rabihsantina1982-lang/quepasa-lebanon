import Image from "next/image";
import { Sparkles, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { EventWithRelations } from "@/lib/supabase/types";
import { formatDateRange, pickLocalized } from "@/lib/utils";

// Paid "Homepage spotlight" events, shown as wide banners above the event grid.
// Swipes sideways on phones when there is more than one.
export async function SpotlightBanner({ events, locale }: { events: EventWithRelations[]; locale: string }) {
  if (events.length === 0) return null;
  const t = await getTranslations("Common");

  return (
    <div className="mt-6 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 [scrollbar-width:none]">
      {events.map((ev) => {
        const title = pickLocalized(ev.title_i18n, locale);
        const image = ev.media.find((m) => m.kind === "image")?.url ?? ev.cover_image;
        return (
          <Link
            key={ev.id}
            href={`/events/${ev.slug}`}
            className={`relative shrink-0 snap-start overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-border)] aspect-[16/9] sm:aspect-[21/8] ${
              events.length > 1 ? "w-[88%] sm:w-[70%]" : "w-full"
            }`}
          >
            {image && <Image src={image} alt={title} fill className="object-cover" sizes="(max-width: 768px) 90vw, 70vw" priority />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
            <span className="absolute top-3 start-3 inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-xs font-semibold text-white">
              <Sparkles size={12} aria-hidden /> {t("featured")}
            </span>
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <h2 className="text-lg sm:text-2xl font-bold leading-tight line-clamp-2">{title}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs sm:text-sm text-white/85">
                <span>{formatDateRange(ev.starts_at, ev.ends_at, locale, ev.timezone)}</span>
                {ev.venue && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} aria-hidden /> {ev.venue.area ?? ev.venue.name}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
