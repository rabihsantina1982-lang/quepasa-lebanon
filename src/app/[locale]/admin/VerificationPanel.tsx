"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle, Info, FileText } from "lucide-react";
import { VERIFICATION_CHECKS, type Checks, type CheckKey, type EmailMatch } from "@/lib/verification";

export interface VerificationDoc {
  id: string;
  kind: string;
  file_name: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  url: string | null; // short-lived private link
}

export interface VerificationInfo {
  userId: string;
  checks: Checks;
  emailMatch: EmailMatch;
  docs: VerificationDoc[];
}

const fmt = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function checksDone(c: Checks): number {
  return VERIFICATION_CHECKS.filter((k) => c[k.key]).length;
}

// Ask before giving the ✓ badge with fewer than 2 checks ticked.
export function confirmVerify(c: Checks, name: string): boolean {
  const n = checksDone(c);
  return n >= 2 || confirm(`Only ${n} of ${VERIFICATION_CHECKS.length} checks are ticked for ${name}. Give the ✓ Verified badge anyway?`);
}

// Admin checklist, email/website hint and uploaded documents for one
// applicant or promoter. Ticks are saved straight away with who and when.
export function VerificationPanel({ info }: { info: VerificationInfo }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function post(url: string, body: Record<string, unknown>, key: string) {
    setBusy(key);
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Something went wrong.");
    }
    setBusy(null);
    router.refresh();
  }

  const m = info.emailMatch;
  const MatchIcon = m.level === "match" ? CheckCircle2 : m.level === "different" ? AlertTriangle : Info;
  const matchColor = m.level === "match" ? "text-[var(--color-success)]" : m.level === "different" ? "text-amber-600" : "text-[var(--color-muted)]";

  return (
    <div className="mt-3 space-y-3 rounded-md border border-[var(--color-border)] p-3 text-sm">
      <div className="flex items-start gap-1.5">
        <MatchIcon size={14} className={`mt-0.5 shrink-0 ${matchColor}`} aria-hidden />
        <span className={matchColor}>{m.text}</span>
      </div>

      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-[var(--color-muted)]">
          Verification checklist · {checksDone(info.checks)} of {VERIFICATION_CHECKS.length}
        </div>
        {VERIFICATION_CHECKS.map((c) => {
          const done = info.checks[c.key as CheckKey];
          return (
            <label key={c.key} className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={!!done}
                disabled={busy === c.key}
                onChange={(e) => post("/api/admin/verification", { userId: info.userId, check: c.key, done: e.target.checked }, c.key)}
              />
              <span>
                {c.label}
                {done && <span className="block text-xs text-[var(--color-muted)]">✓ {done.by}, {fmt(done.at)}</span>}
              </span>
            </label>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-[var(--color-muted)]">Documents</div>
        {info.docs.length === 0 ? (
          <p className="text-xs text-[var(--color-muted)]">None uploaded yet. They can add them from their dashboard.</p>
        ) : (
          info.docs.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-2">
              <FileText size={14} className="shrink-0 text-[var(--color-muted)]" aria-hidden />
              {d.url ? (
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline">
                  {d.kind}
                </a>
              ) : (
                <span>{d.kind}</span>
              )}
              <span className="text-xs text-[var(--color-muted)]">{d.file_name ?? ""} · {fmt(d.created_at)}</span>
              <span
                className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
                  d.status === "accepted" ? "bg-green-100 text-green-700" : d.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {d.status.toUpperCase()}
              </span>
              {d.status !== "accepted" && (
                <button className="text-xs text-[var(--color-primary)] underline" disabled={busy === d.id} onClick={() => post("/api/admin/verification", { docId: d.id, status: "accepted" }, d.id)}>
                  Accept
                </button>
              )}
              {d.status !== "rejected" && (
                <button className="text-xs text-[var(--color-danger)] underline" disabled={busy === d.id} onClick={() => post("/api/admin/verification", { docId: d.id, status: "rejected" }, d.id)}>
                  Reject
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
