"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Application {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  instagram: string | null;
  website: string | null;
  description: string;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
}

export function PromoterQueue({ items }: { items: Application[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function act(applicationId: string, action: "approve" | "reject") {
    setLoading(applicationId);
    await fetch("/api/admin/promoter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, action }),
    });
    setLoading(null);
    router.refresh();
  }

  if (items.length === 0) {
    return <p className="text-[var(--color-muted)]">No pending promoter applications. 🎉</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((a) => (
        <div key={a.id} className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold">{a.business_name}</div>
              <div className="text-sm text-[var(--color-muted)]">
                {a.profiles?.full_name ?? "—"} · {a.profiles?.email ?? "—"}
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-[var(--color-border)] px-2 py-0.5">{a.business_type}</span>
                {a.instagram && <span className="text-[var(--color-muted)]">📷 {a.instagram}</span>}
                {a.website && <a href={a.website} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline">🌐 website</a>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="primary" disabled={loading === a.id} onClick={() => act(a.id, "approve")}>
                Approve
              </Button>
              <Button size="sm" variant="outline" disabled={loading === a.id} onClick={() => act(a.id, "reject")}>
                Reject
              </Button>
            </div>
          </div>

          <button
            className="mt-2 text-xs text-[var(--color-primary)]"
            onClick={() => setExpanded(expanded === a.id ? null : a.id)}
          >
            {expanded === a.id ? "Hide details ▲" : "Show details ▼"}
          </button>

          {expanded === a.id && (
            <p className="mt-2 text-sm text-[var(--color-muted)] whitespace-pre-line border-t border-[var(--color-border)] pt-2">
              {a.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
