// Booking rules for boosts and spotlights: how many places are taken each
// day, whether a chosen period is free, and switching a booking on once it's
// paid or approved. Server-only (needs the service-role client to see every
// promoter's bookings).

import type { SupabaseClient } from "@supabase/supabase-js";
import { SLOTS, BOOK_AHEAD_DAYS } from "./pricing";
import { dayKey, dayStart, addDaysToKey, keysBetween } from "./bookingDays";
import { APP_TIMEZONE } from "./dates";

export type BookableKind = "boost" | "spotlight";

// A card payment holds its place while the payment page is open (it expires
// after 31 minutes, the shortest Stripe allows), with a little to spare.
export const PAYMENT_HOLD_MINUTES = 35;

export interface DayAvailability {
  taken: number;
  mine: boolean; // this event already has this kind of promotion that day
}

export interface Availability {
  slots: number;
  today: string;
  lastStart: string;
  days: Record<string, DayAvailability>;
}

interface Period {
  event_id: string | null;
  starts_at: string;
  ends_at: string;
}

type Timed = { starts_at: string; ends_at: string | null; showtimes?: { starts_at: string; ends_at: string | null }[] | null };

// Last calendar day the event is on.
export function eventLastDay(e: Timed): string {
  const times = [e.starts_at, e.ends_at, ...(e.showtimes ?? []).flatMap((s) => [s.starts_at, s.ends_at])]
    .filter((t): t is string => !!t)
    .map((t) => new Date(t).getTime());
  return dayKey(new Date(Math.max(...times)));
}

// Promotions already running or booked, plus requests still holding a place
// (waiting for an admin, or on the payment page right now).
async function loadBooked(admin: SupabaseClient, kind: BookableKind, from: Date, to: Date): Promise<Period[]> {
  const holdSince = new Date(Date.now() - PAYMENT_HOLD_MINUTES * 60000).toISOString();
  const [{ data: promos }, { data: requests }] = await Promise.all([
    admin
      .from("event_promotions")
      .select("event_id, starts_at, ends_at")
      .eq("kind", kind)
      .lt("starts_at", to.toISOString())
      .gt("ends_at", from.toISOString()),
    admin
      .from("promotion_requests")
      .select("event_id, starts_at, ends_at")
      .eq("kind", kind)
      .not("starts_at", "is", null)
      .lt("starts_at", to.toISOString())
      .gt("ends_at", from.toISOString())
      .or(`status.eq.pending,and(status.eq.awaiting_payment,created_at.gt."${holdSince}")`),
  ]);
  return [...((promos ?? []) as Period[]), ...((requests ?? []) as Period[])];
}

export async function loadAvailability(
  admin: SupabaseClient,
  kind: BookableKind,
  eventId: string | null,
  now = new Date()
): Promise<Availability> {
  const today = dayKey(now);
  const lastStart = addDaysToKey(today, BOOK_AHEAD_DAYS);
  // Far enough to cover a 12-week booking starting on the last day.
  const horizon = addDaysToKey(lastStart, 12 * 7);
  const booked = await loadBooked(admin, kind, dayStart(today), dayStart(horizon));

  const days: Record<string, DayAvailability> = {};
  for (const p of booked) {
    const first = dayKey(new Date(p.starts_at));
    const afterLast = addDaysToKey(dayKey(new Date(new Date(p.ends_at).getTime() - 1)), 1);
    for (const k of keysBetween(first < today ? today : first, afterLast)) {
      const d = (days[k] ??= { taken: 0, mine: false });
      d.taken += 1;
      if (eventId && p.event_id === eventId) d.mine = true;
    }
  }
  return { slots: SLOTS[kind], today, lastStart, days };
}

const fmtDay = (key: string) =>
  dayStart(key).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: APP_TIMEZONE });

// Why a booking can't go ahead, or null if every day in it has a free place.
export async function checkBooking(
  admin: SupabaseClient,
  kind: BookableKind,
  eventId: string,
  startKey: string,
  weeks: number,
  eventLast: string,
  now = new Date()
): Promise<string | null> {
  const avail = await loadAvailability(admin, kind, eventId, now);
  if (startKey < avail.today || startKey > avail.lastStart) {
    return `Pick a start date between today and ${fmtDay(avail.lastStart)}.`;
  }
  if (startKey > eventLast) return "That's after your event ends. Pick an earlier start date.";
  for (const k of keysBetween(startKey, addDaysToKey(startKey, weeks * 7))) {
    const d = avail.days[k];
    if (d?.mine) return `This event already has a ${kind} booked on ${fmtDay(k)}. Pick dates around it.`;
    if ((d?.taken ?? 0) >= avail.slots) return `${fmtDay(k)} is fully booked. Pick other dates.`;
  }
  return null;
}

export interface ActivatableRequest {
  id: string;
  user_id: string;
  event_id: string | null;
  kind: "boost" | "spotlight" | "pro";
  duration: number;
  starts_at: string | null;
  ends_at: string | null;
}

// Switch on a paid / approved request: create the boost or spotlight for its
// booked dates, or extend the account's Pro.
export async function activateRequest(admin: SupabaseClient, request: ActivatableRequest): Promise<string | null> {
  const now = new Date();
  if (request.kind === "pro") {
    const { data: owner } = await admin.from("profiles").select("pro_until").eq("id", request.user_id).single();
    const current = owner?.pro_until ? new Date(owner.pro_until) : null;
    const until = current && current > now ? new Date(current) : new Date(now);
    until.setMonth(until.getMonth() + request.duration);
    const { error } = await admin.from("profiles").update({ pro_until: until.toISOString() }).eq("id", request.user_id);
    return error?.message ?? null;
  }

  let start: Date;
  let end: Date;
  if (request.starts_at && request.ends_at) {
    start = new Date(request.starts_at);
    end = new Date(request.ends_at);
    // Approved late: keep the end date, start now.
    if (start < now) start = now;
    if (end <= start) end = new Date(start.getTime() + request.duration * 7 * 86400000);
  } else {
    // Older requests without dates: queue after any running one on this event.
    const { data: latest } = await admin
      .from("event_promotions")
      .select("ends_at")
      .eq("event_id", request.event_id)
      .eq("kind", request.kind)
      .gt("ends_at", now.toISOString())
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    start = latest ? new Date(latest.ends_at) : now;
    end = new Date(start.getTime() + request.duration * 7 * 86400000);
  }
  const { error } = await admin.from("event_promotions").insert({
    event_id: request.event_id,
    kind: request.kind,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    request_id: request.id,
  });
  return error?.message ?? null;
}
