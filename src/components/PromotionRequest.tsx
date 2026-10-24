"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Sparkles, Home, Star, Check, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRICING, price } from "@/lib/pricing";
import { BookingCalendar, formatDayKey, periodIssues, type AvailabilityData } from "@/components/BookingCalendar";

type Kind = "boost" | "spotlight" | "pro";

const OPTIONS: Record<Kind, { label: string; unit: "week" | "month"; durations: number[]; each: number; Icon: typeof Star }> = {
  boost: { label: "Boost", unit: "week", durations: [1, 2, 3, 4], each: PRICING.boostPerWeek, Icon: Sparkles },
  spotlight: { label: "Homepage spotlight", unit: "week", durations: [1, 2, 3, 4], each: PRICING.spotlightPerWeek, Icon: Home },
  pro: { label: "Pro", unit: "month", durations: [1, 3, 6, 12], each: PRICING.proPerMonth, Icon: Star },
};

// Button that opens a small booking form for a boost, homepage spotlight or
// Pro. Boosts and spotlights get a calendar to pick the dates. The promoter
// then pays by card (Stripe, when switched on) or sends a request and pays
// outside the app; an admin approves those from /admin.
export function PromotionRequest({
  kind,
  eventId,
  eventLastDay = null,
  freeBoostAvailable = false,
  pending = false,
  buttonLabel,
  cardPayments = false,
  testMode = false,
  defaultOpen = false,
}: {
  kind: Kind;
  eventId?: string;
  eventLastDay?: string | null;
  freeBoostAvailable?: boolean;
  pending?: boolean;
  buttonLabel?: string;
  cardPayments?: boolean;
  testMode?: boolean;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const locale = useLocale();
  const opt = OPTIONS[kind];
  const dated = kind !== "pro";
  const [open, setOpen] = useState(defaultOpen);
  const [duration, setDuration] = useState(opt.durations[0]);
  const [start, setStart] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [useFree, setUseFree] = useState(freeBoostAvailable);
  const [showRequest, setShowRequest] = useState(!cardPayments);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState<"card" | "request" | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const free = kind === "boost" && useFree && duration === 1;
  const total = free ? 0 : duration * opt.each;
  const unitLabel = (n: number) => `${n} ${opt.unit}${n > 1 ? "s" : ""}`;
  const issues = dated && start && availability ? periodIssues(availability, start, duration, eventLastDay) : null;
  const blocked = !!issues && (issues.full.length > 0 || issues.mine.length > 0);
  const ready = !dated || (!!start && !blocked);

  if (pending || sent) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)]">
        <Check size={12} aria-hidden /> {opt.label} requested, we&apos;ll be in touch
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline"
      >
        <opt.Icon size={12} aria-hidden /> {buttonLabel ?? opt.label}
      </button>
    );
  }

  const payload = () => ({ kind, eventId, duration, startDate: dated ? start : undefined });

  async function payByCard() {
    setSending("card");
    setError("");
    const res = await fetch("/api/promoter/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload(), locale }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      setSending(null);
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }
    window.location.href = data.url;
  }

  async function sendRequest() {
    setSending("request");
    setError("");
    const res = await fetch("/api/promoter/promotion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload(), useFreeBoost: free, note }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(null);
    if (!res.ok) {
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }
    setSent(true);
    router.refresh();
  }

  return (
    <div className="w-full rounded-md border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 p-3 space-y-3 text-sm font-normal">
      <div className="font-semibold flex items-center gap-1.5">
        <opt.Icon size={14} className="text-[var(--color-primary)]" aria-hidden /> {opt.label}
        <span className="font-normal text-[var(--color-muted)]">· {price(opt.each)} / {opt.unit}</span>
      </div>

      <div className="space-y-1.5">
        <div className="text-xs font-medium">How long?</div>
        <div className="flex flex-wrap gap-2">
          {opt.durations.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={`px-3 py-1.5 rounded-full border text-xs ${
                d === duration ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-[var(--color-border)]"
              }`}
            >
              {unitLabel(d)}
            </button>
          ))}
        </div>
      </div>

      {kind === "boost" && freeBoostAvailable && (
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={useFree} onChange={(e) => setUseFree(e.target.checked)} />
          Use my free Pro boost this month (1 week)
        </label>
      )}

      {dated && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium">Pick the start day</div>
          <BookingCalendar
            kind={kind}
            eventId={eventId}
            eventLastDay={eventLastDay}
            weeks={duration}
            start={start}
            onSelect={setStart}
            onData={setAvailability}
          />
          {start && issues && (
            <div className="text-xs space-y-1">
              <div>
                <strong>{formatDayKey(start)}</strong> to <strong>{formatDayKey(issues.lastKey)}</strong>
              </div>
              {issues.mine.length > 0 && (
                <p className="text-[var(--color-danger)]">
                  This event already has a {kind} on {formatDayKey(issues.mine[0])}. Pick a shorter period or another start day.
                </p>
              )}
              {issues.full.length > 0 && (
                <p className="text-[var(--color-danger)]">
                  {formatDayKey(issues.full[0])} is fully booked. Pick a shorter period or another start day.
                </p>
              )}
              {!blocked && issues.afterEvent > 0 && (
                <p className="text-amber-700 dark:text-amber-300">
                  Heads up: the last {issues.afterEvent} day{issues.afterEvent > 1 ? "s" : ""} run after your event ends.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="font-semibold">Total: {total === 0 ? "Free" : price(total)}</div>

      {free ? (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={!!sending}>Cancel</Button>
          <Button size="sm" variant="primary" onClick={sendRequest} disabled={!!sending || !ready}>
            {sending ? "Booking…" : "Book free boost"}
          </Button>
        </div>
      ) : (
        <>
          {cardPayments && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={!!sending}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={payByCard} disabled={!!sending || !ready}>
                <CreditCard size={14} aria-hidden /> {sending === "card" ? "Opening payment…" : `Pay ${price(total)} by card`}
              </Button>
            </div>
          )}
          {cardPayments && testMode && (
            <p className="text-xs rounded-md bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100 px-2 py-1.5">
              Test mode: no real money is taken. Use card 4242 4242 4242 4242, any future expiry date and any 3-digit code.
            </p>
          )}
          {cardPayments && !showRequest && (
            <button type="button" onClick={() => setShowRequest(true)} className="text-xs text-[var(--color-primary)] hover:underline">
              Prefer to pay by bank transfer? Send a request instead
            </button>
          )}
          {showRequest && (
            <div className="space-y-2">
              <textarea
                rows={2}
                placeholder="Anything we should know? (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-sm outline-none focus:border-[var(--color-primary)] resize-none"
              />
              <div className="flex flex-wrap gap-2">
                {!cardPayments && (
                  <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={!!sending}>Cancel</Button>
                )}
                <Button size="sm" variant={cardPayments ? "outline" : "primary"} onClick={sendRequest} disabled={!!sending || !ready}>
                  {sending === "request" ? "Sending…" : "Send request, pay later"}
                </Button>
              </div>
              <p className="text-xs text-[var(--color-muted)]">
                No payment now. We hold your dates, contact you to arrange payment, then switch it on.
              </p>
            </div>
          )}
        </>
      )}
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
