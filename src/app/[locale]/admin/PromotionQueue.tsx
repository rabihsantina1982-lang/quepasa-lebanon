"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PRICING, price } from "@/lib/pricing";

export interface PromotionRequestItem {
  id: string;
  user_id: string;
  kind: "boost" | "spotlight" | "pro";
  duration: number;
  use_free_boost: boolean;
  note: string | null;
  created_at: string;
  starts_at: string | null;
  ends_at: string | null;
  profiles: { business_name: string | null; display_name: string | null; email: string | null } | null;
  events: { title_i18n: Record<string, string>; slug: string } | null;
}

export interface CardPayment {
  id: string;
  kind: "boost" | "spotlight" | "pro";
  duration: number;
  amount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  paid_at: string;
  profiles: { business_name: string | null; display_name: string | null; email: string | null } | null;
  events: { title_i18n: Record<string, string>; slug: string } | null;
}

export interface ActivePromotion {
  id: string;
  kind: "boost" | "spotlight";
  starts_at: string;
  ends_at: string;
  events: { title_i18n: Record<string, string>; slug: string } | null;
}

export interface ProMember {
  id: string;
  business_name: string | null;
  display_name: string | null;
  email: string | null;
  pro_until: string;
}

const KIND_LABEL = { boost: "Boost", spotlight: "Homepage spotlight", pro: "Pro" } as const;
const fmt = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Beirut" });
// Booked period, shown inclusive of the last day.
const period = (from: string | null, to: string | null) =>
  from && to ? `${fmt(from)} to ${fmt(new Date(new Date(to).getTime() - 1).toISOString())}` : null;

function requestTotal(r: PromotionRequestItem): string {
  if (r.use_free_boost) return "Free (Pro boost)";
  const each = r.kind === "boost" ? PRICING.boostPerWeek : r.kind === "spotlight" ? PRICING.spotlightPerWeek : PRICING.proPerMonth;
  return price(each * r.duration);
}

function useAdminAction() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  async function run(key: string, body: Record<string, string>) {
    setBusy(key);
    const res = await fetch("/api/admin/promotion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Something went wrong.");
    }
    setBusy(null);
    router.refresh();
  }
  return { busy, run };
}

export function PromotionQueue({ items }: { items: PromotionRequestItem[] }) {
  const { busy, run } = useAdminAction();

  if (items.length === 0) {
    return <p className="text-[var(--color-muted)]">No pending boost, spotlight or Pro requests.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((r) => (
        <div key={r.id} className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="font-semibold">
                {KIND_LABEL[r.kind]} · {r.duration} {r.kind === "pro" ? "month" : "week"}{r.duration > 1 ? "s" : ""} · {requestTotal(r)}
              </div>
              {r.events && (
                <a href={`/en/events/${r.events.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--color-primary)] underline">
                  {r.events.title_i18n.en ?? r.events.slug}
                </a>
              )}
              <div className="text-sm text-[var(--color-muted)]">
                {r.profiles?.business_name ?? r.profiles?.display_name ?? "—"} · {r.profiles?.email ?? "—"} · requested {fmt(r.created_at)}
              </div>
              {period(r.starts_at, r.ends_at) && <div className="text-sm">Dates booked: {period(r.starts_at, r.ends_at)}</div>}
              {r.note && <p className="text-sm whitespace-pre-line">“{r.note}”</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="primary" disabled={busy === r.id} onClick={() => run(r.id, { requestId: r.id, action: "approve" })}>
                Approve
              </Button>
              <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => run(r.id, { requestId: r.id, action: "reject" })}>
                Reject
              </Button>
            </div>
          </div>
        </div>
      ))}
      <p className="text-xs text-[var(--color-muted)]">Approve once paid (or as a free gift). It switches on for the dates booked (from today if they have already started). Card payments switch on by themselves and don&apos;t appear here.</p>
    </div>
  );
}

export function ActivePromotions({ promotions, proMembers }: { promotions: ActivePromotion[]; proMembers: ProMember[] }) {
  const { busy, run } = useAdminAction();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="font-semibold mb-2">Boosts &amp; spotlights</h3>
        {promotions.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">None running.</p>
        ) : (
          <ul className="space-y-2">
            {promotions.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{KIND_LABEL[p.kind]}</span> · {p.events?.title_i18n.en ?? p.events?.slug ?? "—"}
                  <span className="block text-xs text-[var(--color-muted)]">
                    {new Date(p.starts_at) > new Date() ? `Starts ${fmt(p.starts_at)}, ` : ""}until {fmt(p.ends_at)}
                  </span>
                </span>
                <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => run(p.id, { promotionId: p.id, action: "end" })}>
                  End now
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="font-semibold mb-2">Pro members</h3>
        {proMembers.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No Pro members.</p>
        ) : (
          <ul className="space-y-2">
            {proMembers.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{m.business_name ?? m.display_name ?? "—"}</span>
                  <span className="block text-xs text-[var(--color-muted)]">{m.email ?? "—"} · until {fmt(m.pro_until)}</span>
                </span>
                <Button size="sm" variant="outline" disabled={busy === m.id} onClick={() => run(m.id, { userId: m.id, action: "end_pro" })}>
                  End Pro
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function CardPayments({ items }: { items: CardPayment[] }) {
  if (items.length === 0) return <p className="text-sm text-[var(--color-muted)]">No card payments yet.</p>;
  return (
    <ul className="space-y-2">
      {items.map((p) => (
        <li key={p.id} className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm">
          <span className="font-medium">{KIND_LABEL[p.kind]}</span> · {p.duration} {p.kind === "pro" ? "month" : "week"}{p.duration > 1 ? "s" : ""}
          {p.amount != null && <> · {price(Number(p.amount))}</>}
          {p.events && <> · {p.events.title_i18n.en ?? p.events.slug}</>}
          <span className="block text-xs text-[var(--color-muted)]">
            {p.profiles?.business_name ?? p.profiles?.display_name ?? "—"} · {p.profiles?.email ?? "—"} · paid {fmt(p.paid_at)}
            {period(p.starts_at, p.ends_at) && <> · runs {period(p.starts_at, p.ends_at)}</>}
          </span>
        </li>
      ))}
    </ul>
  );
}
