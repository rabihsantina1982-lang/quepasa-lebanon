"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PromoterRow {
  id: string;
  business_name: string | null;
  display_name: string | null;
  email: string | null;
  pro_until: string | null;
  verified_at: string | null;
  suspended_at: string | null;
  instagram: string | null;
  verification_code: string | null;
}

type Action = "verify" | "unverify" | "suspend" | "unsuspend";

export function PromoterList({ items }: { items: PromoterRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(p: PromoterRow, action: Action) {
    const name = p.business_name ?? p.display_name ?? "this promoter";
    if (action === "suspend" && !confirm(`Suspend ${name}? All their events and their profile will be hidden, and they won't be able to post.`)) return;
    setBusy(p.id);
    const res = await fetch("/api/admin/promoter-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: p.id, action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Something went wrong.");
    }
    setBusy(null);
    router.refresh();
  }

  if (items.length === 0) return <p className="text-[var(--color-muted)]">No promoters yet.</p>;

  return (
    <ul className="space-y-2">
      {items.map((p) => {
        const suspended = !!p.suspended_at;
        return (
          <li
            key={p.id}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ${
              suspended ? "border-[var(--color-danger)] bg-[var(--color-danger)]/5" : "border-[var(--color-border)]"
            }`}
          >
            <span className="min-w-0">
              <span className="font-medium inline-flex items-center gap-1.5">
                {p.business_name ?? p.display_name ?? "—"}
                {p.verified_at && <BadgeCheck size={14} className="text-[var(--color-primary)]" aria-label="Verified" />}
                {suspended && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger)] text-white text-[10px] font-bold px-2 py-0.5">
                    <Ban size={10} aria-hidden /> SUSPENDED
                  </span>
                )}
                {p.pro_until && new Date(p.pro_until) > new Date() && (
                  <span className="rounded-full bg-[var(--color-primary)] text-white text-[10px] font-bold px-2 py-0.5">PRO</span>
                )}
              </span>
              <span className="block text-xs text-[var(--color-muted)]">
                {p.email ?? "—"}
                {p.instagram && (
                  <>
                    {" · "}
                    <a href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline">
                      @{p.instagram}
                    </a>
                  </>
                )}
                {!p.verified_at && p.verification_code && <> · code <strong>{p.verification_code}</strong></>}
              </span>
            </span>
            <span className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => act(p, p.verified_at ? "unverify" : "verify")}>
                {p.verified_at ? "Remove ✓" : "Verify ✓"}
              </Button>
              <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => act(p, suspended ? "unsuspend" : "suspend")}>
                {suspended ? "Unsuspend" : "Suspend"}
              </Button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
