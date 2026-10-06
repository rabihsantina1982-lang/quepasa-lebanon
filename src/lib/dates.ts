// Calendar days in the app's timezone. The server runs in UTC, so "today",
// "this weekend" etc. must be worked out in local time, not the server's.

export const APP_TIMEZONE = "Asia/Beirut";

export interface Range {
  from: Date;
  to: Date;
}

interface LocalDate {
  y: number;
  m: number; // 1-12
  d: number;
  weekday: number; // 0 = Sunday
}

function localDate(at: Date, tz: string): LocalDate {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric", weekday: "short" })
      .formatToParts(at)
      .map((p) => [p.type, p.value])
  );
  return {
    y: Number(parts.year),
    m: Number(parts.month),
    d: Number(parts.day),
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday),
  };
}

// Minutes the zone is ahead of UTC at a given instant.
function offsetMinutes(at: Date, tz: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
    }).formatToParts(at).map((x) => [x.type, Number(x.value)])
  );
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(at.getTime() / 1000) * 1000) / 60000;
}

// Local midnight at the start of the day `addDays` after `at`'s local date.
export function startOfLocalDay(at: Date, tz = APP_TIMEZONE, addDays = 0): Date {
  const { y, m, d } = localDate(at, tz);
  const guess = Date.UTC(y, m - 1, d + addDays);
  // Two passes so days where daylight saving changes still land on midnight.
  let t = guess - offsetMinutes(new Date(guess), tz) * 60000;
  t = guess - offsetMinutes(new Date(t), tz) * 60000;
  return new Date(t);
}

function days(at: Date, tz: string, from: number, count: number): Range {
  return { from: startOfLocalDay(at, tz, from), to: new Date(startOfLocalDay(at, tz, from + count).getTime() - 1) };
}

// Friday to Sunday: the coming weekend, or the current one from Friday on.
export function weekendRange(now = new Date(), tz = APP_TIMEZONE): Range {
  const { weekday } = localDate(now, tz);
  const toFriday = weekday === 0 ? -2 : weekday === 6 ? -1 : 5 - weekday;
  return days(now, tz, toFriday, 3);
}

// The three weekend days (Fri, Sat, Sun) as separate ranges.
export function weekendDays(now = new Date(), tz = APP_TIMEZONE): Range[] {
  const { from } = weekendRange(now, tz);
  return [0, 1, 2].map((i) => days(from, tz, i, 1));
}

export function presetRange(preset: string | undefined, tz = APP_TIMEZONE, now = new Date()): Range | null {
  switch (preset) {
    case "today": return days(now, tz, 0, 1);
    case "tomorrow": return days(now, tz, 1, 1);
    case "thisWeekend": return weekendRange(now, tz);
    case "thisWeek": {
      const { weekday } = localDate(now, tz);
      return days(now, tz, 0, weekday === 0 ? 1 : 8 - weekday); // through Sunday
    }
    default: return null;
  }
}

type Timed = { starts_at: string; ends_at: string | null; showtimes?: { starts_at: string; ends_at: string | null }[] | null };

function overlaps(startsAt: string, endsAt: string | null, r: Range): boolean {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt ?? startsAt).getTime();
  return start <= r.to.getTime() && end >= r.from.getTime();
}

// Whether the event is on at some point in the range. Multi-date shows
// count only on the dates they actually play, not the days in between.
export function happensDuring(e: Timed, r: Range): boolean {
  if (e.showtimes && e.showtimes.length > 1) return e.showtimes.some((s) => overlaps(s.starts_at, s.ends_at, r));
  return overlaps(e.starts_at, e.ends_at, r);
}
