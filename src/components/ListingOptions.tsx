"use client";

import { useState } from "react";
import { Check, Home, Sparkles, Star, Tag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PRICING, SLOTS, price } from "@/lib/pricing";
import { dayKey } from "@/lib/bookingDays";
import { BookingCalendar, formatDayKey, periodIssues, type AvailabilityData } from "@/components/BookingCalendar";

export type ListingPlan = "free" | "boost" | "spotlight";

const PLANS: { id: ListingPlan; label: string; Icon: typeof Tag; each: number; points: string[] }[] = [
  {
    id: "free",
    label: "Free listing",
    Icon: Tag,
    each: 0,
    points: ["Listed in Browse, Map and search", "Your ticket or booking link", "Views and saves on your dashboard"],
  },
  {
    id: "boost",
    label: "Boost",
    Icon: Sparkles,
    each: PRICING.boostPerWeek,
    points: ["Everything in Free", "Pinned to the top of Browse", "\"Featured\" badge on your event"],
  },
  {
    id: "spotlight",
    label: "Homepage spotlight",
    Icon: Home,
    each: PRICING.spotlightPerWeek,
    points: ["Everything in Free", "Big banner at the top of the homepage", `Up to ${SLOTS.spotlight} events share it each day`],
  },
];

const PRO_POINTS = [
  "Ticket clicks, reminders and shares",
  "Where viewers come from, their language and device",
  "Audience age and gender, and a weekly stats email",
  `${PRICING.proFreeBoostsPerMonth} free Boost week every month, top spot in Connect`,
];

const WEEKS = [1, 2, 3, 4];

function planPrice(each: number): string {
  return each === 0 ? "Free" : `${price(each)} / week`;
}

// Read-only overview at the top of the "Post a new event" page, so promoters
// see every option before they start filling in the form.
export function ListingOptionsOverview() {
  return (
    <div className="mb-6 space-y-2">
      <div className="text-sm font-semibold">How you can list your event</div>
      <div className="grid gap-3 sm:grid-cols-2">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`rounded-[var(--radius-card)] border p-3 text-sm ${
              p.id === "free" ? "border-[var(--color-border)]" : "border-[var(--color-primary)]/50 bg-[var(--color-primary)]/5"
            }`}
          >
            <div className="flex items-center gap-1.5 font-semibold">
              <p.Icon size={14} className="text-[var(--color-primary)]" aria-hidden /> {p.label}
            </div>
            <div className="mt-0.5 font-bold">{planPrice(p.each)}</div>
            <ul className="mt-2 space-y-1 text-xs text-[var(--color-muted)]">
              {p.points.map((pt) => (
                <li key={pt} className="flex gap-1.5">
                  <Check size={12} className="mt-0.5 shrink-0 text-[var(--color-primary)]" aria-hidden /> {pt}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {/* Pro is a monthly plan for the whole account, so it isn't picked per event below. */}
        <div className="rounded-[var(--radius-card)] border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 p-3 text-sm flex flex-col">
          <div className="flex items-center gap-1.5 font-semibold">
            <Star size={14} className="text-[var(--color-primary)]" aria-hidden /> Pro
            <span className="ms-auto text-[10px] font-medium text-[var(--color-muted)]">all your events</span>
          </div>
          <div className="mt-0.5 font-bold">{price(PRICING.proPerMonth)} / month</div>
          <ul className="mt-2 space-y-1 text-xs text-[var(--color-muted)]">
            {PRO_POINTS.map((pt) => (
              <li key={pt} className="flex gap-1.5">
                <Check size={12} className="mt-0.5 shrink-0 text-[var(--color-primary)]" aria-hidden /> {pt}
              </li>
            ))}
          </ul>
          <Link
            href="/promoter?getpro=1#plan"
            className="mt-3 self-start inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            <Star size={12} aria-hidden /> Get Pro
          </Link>
        </div>
      </div>
      <p className="text-xs text-[var(--color-muted)]">
        Boost and Spotlight are chosen at the end of the form, just before you submit, and run on the dates you pick; if
        we don&apos;t approve your event, you&apos;re refunded in full. Pro is a monthly plan for your whole account
        (new organisers get it free for their first {PRICING.proWelcomeMonths} months).
      </p>
    </div>
  );
}

export interface ListingChoice {
  plan: ListingPlan;
  weeks: number;
  start: string | null;
  // A paid plan with a start day picked and no fully booked day in it.
  ready: boolean;
  total: number;
}

// The last calendar day the event is on, from the form's date pickers.
export function lastDayFromInputs(inputs: string[]): string | null {
  const times = inputs.filter(Boolean).map((v) => new Date(v).getTime()).filter((t) => !Number.isNaN(t));
  return times.length ? dayKey(new Date(Math.max(...times))) : null;
}

// Picker just above the Submit button: Free, or a paid option with its weeks
// and start day on the booking calendar.
export function ListingOptionPicker({
  value,
  onChange,
  eventLastDay,
}: {
  value: ListingChoice;
  onChange: (c: ListingChoice) => void;
  eventLastDay: string | null;
}) {
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);

  function update(next: Partial<ListingChoice>, data = availability) {
    const c = { ...value, ...next };
    const plan = PLANS.find((p) => p.id === c.plan)!;
    const issues = c.plan !== "free" && c.start && data ? periodIssues(data, c.start, c.weeks, eventLastDay) : null;
    const blocked = !!issues && (issues.full.length > 0 || issues.mine.length > 0 || (!!eventLastDay && c.start! > eventLastDay));
    onChange({ ...c, total: plan.each * c.weeks, ready: c.plan === "free" || (!!c.start && !blocked) });
  }

  const issues = value.plan !== "free" && value.start && availability ? periodIssues(availability, value.start, value.weeks, eventLastDay) : null;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-3 space-y-3">
      <div className="text-sm font-semibold">Choose how to list it</div>
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Listing option">
        {PLANS.map((p) => {
          const on = value.plan === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                // Switching plan: the calendar reloads for the new kind.
                if (p.id !== value.plan) setAvailability(null);
                update({ plan: p.id, start: p.id === value.plan ? value.start : null }, p.id === value.plan ? availability : null);
              }}
              className={`rounded-md border p-2.5 text-start text-sm ${
                on ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]" : "border-[var(--color-border)]"
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <span
                  className={`w-3.5 h-3.5 rounded-full border-2 ${on ? "border-[var(--color-primary)] bg-[var(--color-primary)]" : "border-[var(--color-border)]"}`}
                  aria-hidden
                />
                {p.label}
              </div>
              <div className="mt-0.5 text-xs text-[var(--color-muted)]">{planPrice(p.each)}</div>
            </button>
          );
        })}
      </div>

      {value.plan !== "free" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="text-xs font-medium">How long?</div>
            <div className="flex flex-wrap gap-2">
              {WEEKS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => update({ weeks: w })}
                  className={`px-3 py-1.5 rounded-full border text-xs ${
                    w === value.weeks ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-[var(--color-border)]"
                  }`}
                >
                  {w} week{w > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium">Pick the start day</div>
            {!eventLastDay && <p className="text-xs text-[var(--color-muted)]">Tip: fill in the event date above first, so days after your event are greyed out.</p>}
            <BookingCalendar
              key={value.plan}
              kind={value.plan}
              eventLastDay={eventLastDay}
              weeks={value.weeks}
              start={value.start}
              onSelect={(k) => update({ start: k })}
              onData={(d) => {
                setAvailability(d);
                update({}, d);
              }}
            />
            {value.start && issues && (
              <div className="text-xs space-y-1">
                <div>
                  <strong>{formatDayKey(value.start)}</strong> to <strong>{formatDayKey(issues.lastKey)}</strong>
                </div>
                {issues.full.length > 0 && (
                  <p className="text-[var(--color-danger)]">
                    {formatDayKey(issues.full[0])} is fully booked. Pick a shorter period or another start day.
                  </p>
                )}
                {!!eventLastDay && value.start > eventLastDay && (
                  <p className="text-[var(--color-danger)]">That start day is after your event. Pick an earlier one.</p>
                )}
                {issues.full.length === 0 && issues.afterEvent > 0 && value.start <= (eventLastDay ?? value.start) && (
                  <p className="text-amber-700 dark:text-amber-300">
                    Heads up: the last {issues.afterEvent} day{issues.afterEvent > 1 ? "s" : ""} run after your event ends.
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="text-sm font-semibold">Total: {price(value.total)}</div>
        </div>
      )}
    </div>
  );
}
