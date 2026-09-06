"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "./ui/button";
import { Upload, Check } from "lucide-react";
import Image from "next/image";

export function BusinessProfileForm({
  initialBusinessName,
  initialLogoUrl,
}: {
  initialBusinessName: string | null;
  initialLogoUrl: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [businessName, setBusinessName] = useState(initialBusinessName ?? "");
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in.");

      let newLogoUrl = logoUrl;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `events/${user.id}/logo-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("event-media").upload(path, logoFile, { contentType: logoFile.type });
        if (uploadErr) throw new Error(`Logo upload failed: ${uploadErr.message}`);
        newLogoUrl = supabase.storage.from("event-media").getPublicUrl(path).data.publicUrl;
      }

      const res = await fetch("/api/promoter/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_name: businessName, logo_url: newLogoUrl }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to save.");

      setLogoUrl(newLogoUrl);
      setLogoFile(null);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const displayLogo = logoPreview ?? logoUrl;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-5 space-y-4">
      <div className="font-semibold">Business profile</div>
      <p className="text-sm text-[var(--color-muted)]">
        Shown to everyone under every event you post.
      </p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-[var(--color-border)] flex items-center justify-center bg-[var(--color-bg)] shrink-0 hover:border-[var(--color-primary)] transition-colors"
        >
          {displayLogo ? (
            <Image src={displayLogo} alt="Logo" fill className="object-cover" />
          ) : (
            <Upload size={18} className="text-[var(--color-muted)]" />
          )}
        </button>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium">Business name</label>
          <input
            value={businessName}
            onChange={(e) => { setBusinessName(e.target.value); setSaved(false); }}
            className="w-full h-11 px-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      <Button size="sm" variant="primary" onClick={handleSave} disabled={saving}>
        {saved ? <Check size={14} /> : null}
        {saving ? "Saving…" : saved ? "Saved" : "Save"}
      </Button>
    </div>
  );
}
