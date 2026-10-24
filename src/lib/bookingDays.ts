// Calendar days for booking boosts / spotlights, as "YYYY-MM-DD" keys in the
// app's timezone. Used by both the booking calendar (browser) and the server.

import { APP_TIMEZONE, startOfLocalDay } from "./dates";

export function dayKey(at: Date, tz = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

// Local midnight at the start of a day key (plus `addDays`).
export function dayStart(key: string, addDays = 0, tz = APP_TIMEZONE): Date {
  const [y, m, d] = key.split("-").map(Number);
  // Noon UTC falls on the same calendar day in every timezone we use.
  return startOfLocalDay(new Date(Date.UTC(y, m - 1, d, 12)), tz, addDays);
}

export function addDaysToKey(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function isDayKey(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

// The period a booking covers: from the start day's midnight (or right now if
// it starts today) for `weeks` whole weeks.
export function bookingPeriod(startKey: string, weeks: number, now = new Date()): { start: Date; end: Date } {
  const start = dayStart(startKey);
  return { start: start < now ? now : start, end: dayStart(startKey, weeks * 7) };
}

// Day keys from `fromKey` up to, not including, `toKey`.
export function keysBetween(fromKey: string, toKey: string): string[] {
  const out: string[] = [];
  for (let k = fromKey; k < toKey && out.length < 1000; k = addDaysToKey(k, 1)) out.push(k);
  return out;
}
