import { fetchEvents } from "./queries";
import { weekendRange, weekendDays, happensDuring, APP_TIMEZONE, type Range } from "./dates";
import { isPromoted } from "./promotions";
import { pickLocalized } from "./utils";
import type { EventWithRelations } from "./supabase/types";

// The weekly "What's on this weekend" post for Instagram / WhatsApp:
// the same events as /weekend, boosted ones first, as caption text + image data.

export const SITE_NAME = "QuePasa Lebanon";
export const PLACE_NAME = "Lebanon";
export const REGION_PARAM = "governorate";
const LOCALE = "en";
// Day-month order ("Fri 9 Oct"), as written in Lebanon.
const DATE_LOCALE = "en-GB";

// How many events the image and caption name; the rest are behind the link.
export const POST_MAX_EVENTS = 8;

export interface PostItem {
  title: string;
  day: string; // "Fri", "Sat", "All weekend"
  place: string; // "Venue, Area"
  featured: boolean;
}

export interface WeekendPost {
  range: Range;
  rangeLabel: string; // "Fri 16 – Sun 18 Oct"
  total: number;
  items: PostItem[];
  pageUrl: string;
  caption: string;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function weekendPageUrl(region?: string): string {
  return `${siteUrl()}/${LOCALE}/weekend${region ? `?${REGION_PARAM}=${region}` : ""}`;
}

export async function buildWeekendPost(region?: string, regionName?: string): Promise<WeekendPost> {
  const now = new Date();
  const range = weekendRange(now);
  const days = weekendDays(now).filter((d) => d.to > now);
  const events = await fetchEvents({ when: "thisWeekend", [REGION_PARAM]: region });

  const short = new Intl.DateTimeFormat(DATE_LOCALE, { weekday: "short", timeZone: APP_TIMEZONE });
  const dayOf = (e: EventWithRelations): string => {
    const on = days.filter((d) => happensDuring(e, d));
    if (days.length > 1 && on.length === days.length) return "All weekend";
    return on.length ? short.format(on[0].to) : short.format(range.from);
  };

  // Boosted / spotlighted first, then one-off events before exhibitions
  // that run all weekend (they would otherwise fill the list, being oldest).
  const all = events
    .map((e) => ({
      title: pickLocalized(e.title_i18n, LOCALE),
      day: dayOf(e),
      place: [e.venue?.name, e.venue?.area].filter(Boolean).join(", "),
      featured: isPromoted(e),
    }))
    .sort((a, b) => Number(b.featured) - Number(a.featured) || Number(a.day === "All weekend") - Number(b.day === "All weekend"));
  const items = all.slice(0, POST_MAX_EVENTS);

  const rangeLabel = new Intl.DateTimeFormat(DATE_LOCALE, { weekday: "short", day: "numeric", month: "short", timeZone: APP_TIMEZONE })
    .formatRange(range.from, range.to);
  const pageUrl = weekendPageUrl(region);
  const where = regionName ?? PLACE_NAME;

  const lines = [
    `🎉 What's on this weekend in ${where}`,
    `📅 ${rangeLabel}`,
    "",
    ...items.map((i) => `${i.featured ? "⭐" : "•"} ${i.day}: ${i.title}${i.place ? ` @ ${i.place}` : ""}`),
  ];
  if (events.length > items.length) lines.push(`…and ${events.length - items.length} more`);
  lines.push("", `👉 All ${events.length} events: ${pageUrl}`);
  if (items.some((i) => i.featured)) lines.push("⭐ = Featured");

  return {
    range,
    rangeLabel,
    total: events.length,
    items,
    pageUrl,
    caption: events.length ? lines.join("\n") : `Nothing listed for this weekend in ${where} yet.`,
  };
}
