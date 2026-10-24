"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysToKey, keysBetween } from "@/lib/bookingDays";

export interface AvailabilityData {
  slots: number;
  today: string;
  lastStart: string;
  days: Record<string, { taken: number; mine: boolean }>;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const monthOf = (key: string) => key.slice(0, 7);
const weekdayMon0 = (key: string) => (new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7;
function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export function formatDayKey(key: string): string {
  const d = new Date(`${key}T12:00:00Z`);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

// Problems with a chosen period, worked out from the calendar data.
export function periodIssues(data: AvailabilityData, start: string, weeks: number, eventLastDay: string | null) {
  const keys = keysBetween(start, addDaysToKey(start, weeks * 7));
  const full = keys.filter((k) => (data.days[k]?.taken ?? 0) >= data.slots && !data.days[k]?.mine);
  const mine = keys.filter((k) => data.days[k]?.mine);
  const afterEvent = eventLastDay ? keys.filter((k) => k > eventLastDay).length : 0;
  return { full, mine, afterEvent, lastKey: keys[keys.length - 1] };
}

// Month calendar showing how many boost / spotlight places are left each day.
// The promoter taps a start day; the booked weeks are highlighted from there.
export function BookingCalendar({
  kind,
  eventId,
  eventLastDay,
  weeks,
  start,
  onSelect,
  onData,
}: {
  kind: "boost" | "spotlight";
  eventId?: string;
  eventLastDay: string | null;
  weeks: number;
  start: string | null;
  onSelect: (key: string) => void;
  onData?: (data: AvailabilityData) => void;
}) {
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [error, setError] = useState("");
  const [month, setMonth] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const qs = new URLSearchParams({ kind, ...(eventId ? { eventId } : {}) });
    fetch(`/api/promoter/availability?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: AvailabilityData) => {
        if (!alive) return;
        setData(d);
        setMonth(monthOf(d.today));
        onData?.(d);
      })
      .catch(() => alive && setError("Couldn't load the calendar. Please try again."));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, eventId]);

  const selected = useMemo(() => new Set(start ? keysBetween(start, addDaysToKey(start, weeks * 7)) : []), [start, weeks]);

  if (error) return <p className="text-xs text-[var(--color-danger)]">{error}</p>;
  if (!data || !month) return <div className="h-64 rounded-md bg-[var(--color-border)]/40 animate-pulse" aria-label="Loading calendar" />;

  const lastBookable = eventLastDay && eventLastDay < data.lastStart ? eventLastDay : data.lastStart;
  const first = `${month}-01`;
  const lead = weekdayMon0(first);
  const daysInMonth: string[] = [];
  for (let k = first; monthOf(k) === month; k = addDaysToKey(k, 1)) daysInMonth.push(k);
  const canPrev = month > monthOf(data.today);
  const canNext = month < monthOf(lastBookable);
  const [y, m] = month.split("-").map(Number);

  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, -1))}
          disabled={!canPrev}
          aria-label="Previous month"
          className="p-1 rounded hover:bg-[var(--color-border)] disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="font-semibold text-sm">{MONTHS[m - 1]} {y}</div>
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={!canNext}
          aria-label="Next month"
          className="p-1 rounded hover:bg-[var(--color-border)] disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[var(--color-muted)]">
        {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => <div key={`pad-${i}`} />)}
        {daysInMonth.map((k) => {
          const day = data.days[k];
          const left = data.slots - (day?.taken ?? 0);
          const outside = k < data.today || k > lastBookable;
          const full = left <= 0 && !day?.mine;
          const mine = !!day?.mine;
          const inPeriod = selected.has(k);
          const isStart = k === start;
          const disabled = outside || full || mine;
          const tone = inPeriod
            ? full || mine
              ? "bg-[var(--color-danger)] text-white"
              : "bg-[var(--color-primary)] text-white"
            : outside
              ? "text-[var(--color-muted)] opacity-40"
              : mine
                ? "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
                : full
                  ? "bg-[var(--color-border)] text-[var(--color-muted)] line-through"
                  : left <= 2
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
                    : "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100";
          const title = outside
            ? k > (eventLastDay ?? "9999") ? "After your event" : "Not bookable"
            : mine
              ? "Already booked for this event"
              : full
                ? "Fully booked"
                : `${left} of ${data.slots} places left`;
          return (
            <button
              key={k}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(k)}
              title={title}
              aria-label={`${formatDayKey(k)}: ${title}`}
              aria-pressed={isStart}
              className={`h-9 rounded text-xs font-medium flex flex-col items-center justify-center leading-none ${tone} ${
                isStart ? "ring-2 ring-offset-1 ring-[var(--color-primary)]" : ""
              } ${disabled ? "cursor-not-allowed" : "hover:opacity-80"}`}
            >
              {Number(k.slice(8))}
              {!outside && !full && !mine && !inPeriod && left <= 2 && <span className="text-[9px] font-normal mt-0.5">{left} left</span>}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--color-muted)]">
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-200" /> Available</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-200" /> Few places left</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-border)]" /> Fully booked</span>
        {eventId && <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-violet-200" /> Already booked for this event</span>}
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-primary)]" /> Your dates</span>
      </div>
      <p className="text-[10px] text-[var(--color-muted)]">
        {kind === "spotlight"
          ? `The homepage banner shows up to ${data.slots} events a day.`
          : `Up to ${data.slots} events can be boosted on the same day.`}
      </p>
    </div>
  );
}
