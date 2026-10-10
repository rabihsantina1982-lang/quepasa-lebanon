"use client";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AlertTriangle, BadgeCheck, CheckCircle2, Phone } from "lucide-react";
import type { LinkCheck } from "@/lib/ticketLinks";
import type { ScamSignal } from "@/lib/scamSignals";

export interface SubmissionRow {
  id: string;
  slug: string;
  title_i18n: Record<string, string>;
  starts_at: string;
  source: string;
  created_at: string;
  ticket_url: string | null;
  booking_phone: string | null;
  showtimes: { ticket_url?: string | null }[] | null;
  submitter: { business_name: string | null; display_name: string | null; email: string | null; verified_at: string | null } | null;
  links: (LinkCheck & { url: string })[];
  signals: ScamSignal[];
}

const LEVEL_STYLE = {
  ok: "text-[var(--color-success)]",
  check: "text-amber-600",
  danger: "text-[var(--color-danger)]",
} as const;

export function AdminQueue({ items }: { items: SubmissionRow[] }) {
  const router = useRouter();
  async function setStatus(r: SubmissionRow, status: "published" | "rejected") {
    if (status === "published" && (r.links.some((l) => l.level === "danger") || r.signals.some((s) => s.level === "danger"))) {
      if (!confirm("This event has scam warning signs. Publish it anyway?")) return;
    }
    const supabase = createClient();
    await supabase.from("events").update({ status }).eq("id", r.id);
    router.refresh();
  }
  if (items.length === 0) return <p className="text-[var(--color-muted)]">Nothing pending. 🎉</p>;
  return (
    <div className="space-y-3">
      {items.map((r) => {
        const danger = r.links.some((l) => l.level === "danger") || r.signals.some((s) => s.level === "danger");
        const who = r.submitter?.business_name ?? r.submitter?.display_name;
        return (
          <div
            key={r.id}
            className={`rounded-[var(--radius-card)] border p-4 text-sm ${danger ? "border-[var(--color-danger)]" : "border-[var(--color-border)]"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="font-semibold text-base">{r.title_i18n.en ?? r.slug}</div>
                <div className="text-[var(--color-muted)]">
                  {new Date(r.starts_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} · {r.source}
                </div>
                <div className="text-[var(--color-muted)] inline-flex flex-wrap items-center gap-1">
                  From{" "}
                  <span className="font-medium text-[var(--color-fg)]">{who ?? "—"}</span>
                  {r.submitter?.verified_at && <BadgeCheck size={14} className="text-[var(--color-primary)]" aria-label="Verified" />}
                  {r.submitter?.email && <span>· {r.submitter.email}</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="primary" onClick={() => setStatus(r, "published")}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus(r, "rejected")}>Reject</Button>
              </div>
            </div>

            <div className="mt-3 space-y-1.5 border-t border-[var(--color-border)] pt-3">
              {r.links.length === 0 && !r.booking_phone && (
                <div className="text-[var(--color-muted)]">No ticket link or booking phone.</div>
              )}
              {r.links.map((l) => (
                <div key={l.url} className="flex items-start gap-1.5">
                  {l.level === "ok" ? (
                    <CheckCircle2 size={14} className={`mt-0.5 shrink-0 ${LEVEL_STYLE.ok}`} aria-hidden />
                  ) : (
                    <AlertTriangle size={14} className={`mt-0.5 shrink-0 ${LEVEL_STYLE[l.level]}`} aria-hidden />
                  )}
                  <span className="min-w-0">
                    <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium underline break-all">
                      {l.host}
                    </a>
                    {l.note ? <span className={`block ${LEVEL_STYLE[l.level]}`}>{l.note}</span> : <span className="text-[var(--color-muted)]"> · known ticket seller</span>}
                  </span>
                </div>
              ))}
              {r.signals.map((sig) => (
                <div key={sig.note} className={`flex items-start gap-1.5 font-medium ${LEVEL_STYLE[sig.level]}`}>
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden /> {sig.note}
                </div>
              ))}
              {r.booking_phone && (
                <div className="flex items-center gap-1.5 text-[var(--color-muted)]">
                  <Phone size={14} aria-hidden /> Booking phone: <span className="text-[var(--color-fg)]">{r.booking_phone}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
