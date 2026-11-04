"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Lock, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { DOC_KINDS, DOC_MAX_BYTES, DOC_TYPES, type DocKind } from "@/lib/verification";

export interface OwnDoc {
  id: string;
  kind: string;
  file_name: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

const STATUS = {
  pending: { label: "Under review", cls: "bg-yellow-100 text-yellow-800" },
  accepted: { label: "Accepted", cls: "bg-green-100 text-green-700" },
  rejected: { label: "Not accepted, please upload a clearer or current copy", cls: "bg-red-100 text-red-700" },
} as const;

// Organisers upload a trade licence, event permit or ID so we can give the
// ✓ Verified badge. Files go to a private folder only they and our admins
// can open (storage bucket "verification-docs", migration 0030).
export function VerificationDocs({ userId, initialDocs }: { userId: string; initialDocs: OwnDoc[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<DocKind>("trade_licence");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setError("");
    if (!DOC_TYPES.includes(file.type)) return setError("Please upload a PDF or a photo (JPG, PNG, WEBP or HEIC).");
    if (file.size > DOC_MAX_BYTES) return setError("That file is over 10 MB. Please upload a smaller copy.");
    setUploading(true);
    const supabase = createClient();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);
    const path = `${userId}/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage.from("verification-docs").upload(path, file, { contentType: file.type });
    if (upErr) {
      setUploading(false);
      return setError("Upload failed. Please try again.");
    }
    const { error: rowErr } = await supabase.from("verification_documents").insert({ user_id: userId, kind, path, file_name: file.name.slice(0, 120) });
    setUploading(false);
    if (rowErr) {
      await supabase.storage.from("verification-docs").remove([path]);
      return setError("Couldn't save the document. Please try again.");
    }
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  const label = (k: string) => DOC_KINDS.find((d) => d.key === k)?.label ?? k;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-4 space-y-3 text-sm">
      <div className="font-semibold">Business documents</div>
      <p className="text-[var(--color-muted)]">
        To get the ✓ Verified badge, upload your trade licence, an event permit, or the ID of the person responsible. We use
        them only to confirm your business is real.
      </p>
      <p className="flex items-start gap-1.5 text-xs text-[var(--color-muted)]">
        <Lock size={12} className="mt-0.5 shrink-0" aria-hidden /> Private: only QuePasa&apos;s admins can open them. They are
        never shown on the site.
      </p>

      {initialDocs.length > 0 && (
        <ul className="space-y-1.5">
          {initialDocs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2">
              <FileText size={14} className="shrink-0 text-[var(--color-muted)]" aria-hidden />
              <span className="font-medium">{label(d.kind)}</span>
              <span className="text-xs text-[var(--color-muted)] truncate max-w-[12rem]">{d.file_name}</span>
              <span className={`text-[11px] rounded-full px-2 py-0.5 ${STATUS[d.status].cls}`}>{STATUS[d.status].label}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as DocKind)}
          className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-sm"
          aria-label="Document type"
        >
          {DOC_KINDS.map((d) => (
            <option key={d.key} value={d.key}>{d.label}</option>
          ))}
        </select>
        <input
          ref={inputRef}
          type="file"
          accept={DOC_TYPES.join(",")}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <Button size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <Upload size={14} aria-hidden /> {uploading ? "Uploading…" : "Upload document"}
        </Button>
      </div>
      <p className="text-xs text-[var(--color-muted)]">PDF or photo, up to 10 MB.</p>
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}
