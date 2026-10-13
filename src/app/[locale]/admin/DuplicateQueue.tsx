"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteEventButton } from "@/components/DeleteEventButton";

export interface DuplicateSide {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  status: string;
  source: string | null;
  posted_by: string | null;
  venue_name: string | null;
  cover_image: string | null;
  created_at: string;
}

const SOURCE_LABELS: Record<string, string> = {
  promoter: "posted by organiser",
  admin: "added by QuePasa",
  manual: "added by QuePasa",
  ticketmaster: "Ticketmaster import",
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Beirut" });

export function DuplicateQueue({ pairs }: { pairs: [DuplicateSide, DuplicateSide][] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function notDuplicates(a: DuplicateSide, b: DuplicateSide) {
    setBusy(a.id + b.id);
    const res = await fetch("/api/admin/duplicates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a: a.id, b: b.id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Something went wrong.");
    }
    setBusy(null);
    router.refresh();
  }

  if (pairs.length === 0) return <p className="text-[var(--color-muted)]">No possible duplicates. 🎉</p>;

  return (
    <div className="space-y-3">
      {pairs.map(([a, b]) => (
        <div key={a.id + b.id} className="rounded-[var(--radius-card)] border border-[var(--color-accent)] p-4 text-sm space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            {[a, b].map((e) => (
              <div key={e.id} className="rounded-[var(--radius-card)] bg-[var(--color-card)] border border-[var(--color-border)] p-3 flex gap-3 min-w-0">
                {e.cover_image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.cover_image} alt="" className="w-16 h-16 rounded object-cover shrink-0" />
                )}
                <div className="min-w-0 space-y-1">
                  <a href={`/en/events/${e.slug}`} target="_blank" rel="noopener noreferrer" className="font-semibold underline break-words">{e.title}</a>
                  <div className="text-[var(--color-muted)]">
                    {day(e.starts_at)}{e.ends_at && day(e.ends_at) !== day(e.starts_at) ? ` – ${day(e.ends_at)}` : ""}
                    {e.venue_name && <> · {e.venue_name}</>}
                  </div>
                  <div className="text-xs text-[var(--color-muted)]">
                    {e.posted_by ? <>posted by <span className="text-[var(--color-fg)]">{e.posted_by}</span></> : SOURCE_LABELS[e.source ?? ""] ?? e.source ?? "imported"}
                    {" · "}{e.status === "pending" ? <span className="font-medium text-[var(--color-accent)]">waiting for review</span> : "live"}
                    {" · "}listed {new Date(e.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </div>
                  <DeleteEventButton
                    eventId={e.id}
                    label="Delete this one"
                    confirmText={`Delete "${e.title}" permanently and keep the other listing? This can't be undone.`}
                    className="text-xs font-medium pt-1"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button size="sm" variant="outline" disabled={busy === a.id + b.id} onClick={() => notDuplicates(a, b)}>
              <Copy size={14} aria-hidden /> Not duplicates, keep both
            </Button>
          </div>
        </div>
      ))}
      <p className="text-xs text-[var(--color-muted)]">
        Same place, overlapping dates and very similar titles. Usually keep the organiser&apos;s own post (it has their photos and
        stats) and delete our imported copy, unless theirs is missing details.
      </p>
    </div>
  );
}
