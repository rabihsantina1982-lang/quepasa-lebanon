"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { REPORT_REASON_LABELS, AUTO_HIDE_REPORTS, type ReportReason } from "@/lib/reports";

export interface ReportedEvent {
  eventId: string;
  title: string;
  slug: string;
  status: string;
  promoter: string | null;
  reports: { id: string; reason: ReportReason; details: string | null; created_at: string; reporter: string | null }[];
}

// Hidden by the report threshold (an admin "Hide" closes the reports).
const autoHidden = (e: ReportedEvent) => e.status === "draft" && e.reports.length >= AUTO_HIDE_REPORTS;

export function ReportQueue({ items }: { items: ReportedEvent[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(e: ReportedEvent, action: "hide" | "dismiss" | "restore") {
    if (action === "hide" && e.status === "published" && !confirm(`Hide "${e.title}" from the site? It goes back to draft.`)) return;
    setBusy(e.eventId);
    const res = await fetch("/api/admin/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: e.eventId, action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Something went wrong.");
    }
    setBusy(null);
    router.refresh();
  }

  if (items.length === 0) return <p className="text-[var(--color-muted)]">No open reports. 🎉</p>;

  return (
    <div className="space-y-3">
      {items.map((e) => (
        <div key={e.eventId} className="rounded-[var(--radius-card)] border border-[var(--color-danger)] p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="font-semibold text-base inline-flex items-center gap-2">
                <Flag size={14} className="text-[var(--color-danger)]" aria-hidden />
                {e.status === "published" ? (
                  <a href={`/en/events/${e.slug}`} target="_blank" rel="noopener noreferrer" className="underline">{e.title}</a>
                ) : (
                  <span>{e.title} <span className="text-xs font-normal text-[var(--color-muted)]">({e.status})</span></span>
                )}
              </div>
              {autoHidden(e) && (
                <div className="font-medium text-[var(--color-danger)]">Hidden automatically after {e.reports.length} reports. Restore it if the reports are wrong.</div>
              )}
              <div className="text-[var(--color-muted)]">
                {e.reports.length} report{e.reports.length > 1 ? "s" : ""}
                {e.promoter && <> · posted by <span className="text-[var(--color-fg)]">{e.promoter}</span></>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {e.status === "published" && (
                <Button size="sm" variant="primary" disabled={busy === e.eventId} onClick={() => act(e, "hide")}>Hide event</Button>
              )}
              {autoHidden(e) ? (
                <>
                  <Button size="sm" variant="primary" disabled={busy === e.eventId} onClick={() => act(e, "hide")}>Keep hidden</Button>
                  <Button size="sm" variant="outline" disabled={busy === e.eventId} onClick={() => act(e, "restore")}>Restore event</Button>
                </>
              ) : (
                <Button size="sm" variant="outline" disabled={busy === e.eventId} onClick={() => act(e, "dismiss")}>
                  {e.status === "published" ? "Dismiss" : "Close reports"}
                </Button>
              )}
            </div>
          </div>
          <ul className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-3">
            {e.reports.map((r) => (
              <li key={r.id}>
                <span className="font-medium">{REPORT_REASON_LABELS[r.reason]}</span>
                <span className="text-[var(--color-muted)]">
                  {" "}· {r.reporter ?? "unknown"} · {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
                {r.details && <p className="mt-0.5 whitespace-pre-line text-[var(--color-fg)]/90">{r.details}</p>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="text-xs text-[var(--color-muted)]">
        <strong>Hide event</strong> takes it off the site. If the promoter is behind a scam, also <strong>Suspend</strong> them under Promoters.
      </p>
    </div>
  );
}
