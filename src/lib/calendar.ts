import { createEvent, type EventAttributes } from "ics";
import type { EventWithRelations } from "./supabase/types";
import { pickLocalized } from "./utils";

function toIcsDateArray(d: Date): [number, number, number, number, number] {
  return [
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
  ];
}

function gcalFmt(d: Date): string {
  // YYYYMMDDTHHmmssZ
  return d.toISOString().replace(/[-:]|\.\d{3}/g, "");
}

export function buildGoogleCalendarUrl(
  event: EventWithRelations,
  locale = "en"
): string {
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: pickLocalized(event.title_i18n, locale),
    dates: `${gcalFmt(start)}/${gcalFmt(end)}`,
    details: pickLocalized(event.description_i18n, locale),
    location: event.venue ? [event.venue.name, event.venue.address, event.venue.city].filter(Boolean).join(", ") : "Beirut",
    ctz: event.timezone || "Asia/Beirut",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcs(event: EventWithRelations, locale = "en"): string {
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const attrs: EventAttributes = {
    start: toIcsDateArray(start),
    startInputType: "utc",
    end: toIcsDateArray(end),
    endInputType: "utc",
    title: pickLocalized(event.title_i18n, locale),
    description: pickLocalized(event.description_i18n, locale),
    location: event.venue
      ? [event.venue.name, event.venue.address, event.venue.city].filter(Boolean).join(", ")
      : "Beirut",
    url: event.ticket_url || undefined,
    uid: `${event.id}@quepasa`,
    productId: "quepasa/ics",
  };
  const { error, value } = createEvent(attrs);
  if (error || !value) throw error ?? new Error("Failed to build ICS");
  return value;
}
