"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Application {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  instagram: string | null;
  phone: string | null;
  website: string | null;
  description: string;
  verification_code: string | null;
  created_at: string;
  profiles: { display_name: string | null; email: string | null } | null;
  warnings: string[];
}

export function PromoterQueue({ items }: { items: Application[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function act(applicationId: string, action: "approve" | "reject", verify = false) {
    setLoading(applicationId);
    await fetch("/api/admin/promoter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, action, verify }),
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
        <div
          key={a.id}
          className={`rounded-[var(--radius-card)] border p-4 ${a.warnings.length ? "border-[var(--color-danger)]" : "border-[var(--color-border)]"}`}
        >
          {a.warnings.length > 0 && (
            <div className="mb-3 rounded-md bg-[var(--color-danger)]/10 p-3 text-sm text-[var(--color-danger)] space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle size={14} aria-hidden /> Possible impersonation, check carefully
              </div>
              {a.warnings.map((w) => <div key={w}>• {w}</div>)}
            </div>
          )}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="font-semibold">{a.business_name}</div>
              <div className="text-sm text-[var(--color-muted)]">
                {a.profiles?.display_name ?? "—"} · {a.profiles?.email ?? "—"}{a.phone ? ` · ${a.phone}` : ""}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-[var(--color-border)] px-2 py-0.5">{a.business_type}</span>
                {a.instagram && (
                  <a href={`https://instagram.com/${a.instagram}`} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline">
                    📷 @{a.instagram}
                  </a>
                )}
                {a.website && <a href={a.website} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline">🌐 website</a>}
              </div>
              {a.verification_code && (
                <div className="text-sm">
                  Code to look for in their Instagram bio: <strong className="tracking-wider">{a.verification_code}</strong>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button size="sm" variant="primary" disabled={loading === a.id} onClick={() => act(a.id, "approve", true)}>
                Approve &amp; verify
              </Button>
              <Button size="sm" variant="outline" disabled={loading === a.id} onClick={() => act(a.id, "approve")}>
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
      <p className="text-xs text-[var(--color-muted)]">
        Use <strong>Approve &amp; verify</strong> only after opening their Instagram and seeing the code in the bio. Plain{" "}
        <strong>Approve</strong> lets them post without the ✓ badge; you can verify them later under Promoters.
      </p>
    </div>
  );
}
