"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Home, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRICING, price } from "@/lib/pricing";

type Kind = "boost" | "spotlight" | "pro";

const OPTIONS: Record<Kind, { label: string; unit: "week" | "month"; durations: number[]; each: number; Icon: typeof Star }> = {
  boost: { label: "Boost", unit: "week", durations: [1, 2, 4], each: PRICING.boostPerWeek, Icon: Sparkles },
  spotlight: { label: "Homepage spotlight", unit: "week", durations: [1, 2, 4], each: PRICING.spotlightPerWeek, Icon: Home },
  pro: { label: "Pro", unit: "month", durations: [1, 3, 6, 12], each: PRICING.proPerMonth, Icon: Star },
};

// Button that opens a small request form for a boost, homepage spotlight or
// Pro. Nothing is charged in the app: the request lands in the admin queue
// and we contact the promoter to confirm and arrange payment.
export function PromotionRequest({
  kind,
  eventId,
  freeBoostAvailable = false,
  pending = false,
  buttonLabel,
}: {
  kind: Kind;
  eventId?: string;
  freeBoostAvailable?: boolean;
  pending?: boolean;
  buttonLabel?: string;
}) {
  const router = useRouter();
  const opt = OPTIONS[kind];
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState(opt.durations[0]);
  const [useFree, setUseFree] = useState(freeBoostAvailable);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const free = kind === "boost" && useFree && duration === 1;
  const total = free ? 0 : duration * opt.each;
  const unitLabel = (n: number) => `${n} ${opt.unit}${n > 1 ? "s" : ""}`;

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

  async function send() {
    setSending(true);
    setError("");
    const res = await fetch("/api/promoter/promotion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, eventId, duration, useFreeBoost: free, note }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }
    setSent(true);
    router.refresh();
  }

  return (
    <div className="w-full rounded-md border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 p-3 space-y-3 text-sm">
      <div className="font-semibold flex items-center gap-1.5">
        <opt.Icon size={14} className="text-[var(--color-primary)]" aria-hidden /> {opt.label}
        <span className="font-normal text-[var(--color-muted)]">· {price(opt.each)} / {opt.unit}</span>
      </div>
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
      {kind === "boost" && freeBoostAvailable && (
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={useFree} onChange={(e) => setUseFree(e.target.checked)} />
          Use my free Pro boost this month (1 week)
        </label>
      )}
      <textarea
        rows={2}
        placeholder="Anything we should know? (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-sm outline-none focus:border-[var(--color-primary)] resize-none"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">Total: {total === 0 ? "Free" : price(total)}</div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={sending}>Cancel</Button>
          <Button size="sm" variant="primary" onClick={send} disabled={sending}>
            {sending ? "Sending…" : "Send request"}
          </Button>
        </div>
      </div>
      <p className="text-xs text-[var(--color-muted)]">
        {total === 0
          ? "We'll switch it on shortly."
          : "No payment now. We'll contact you to confirm and arrange payment, then switch it on."}
      </p>
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
