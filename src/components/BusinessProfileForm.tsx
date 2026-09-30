"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "./ui/button";
import { Upload, Check } from "lucide-react";
import Image from "next/image";
import { PROFILE_TYPES, PROFILE_TYPE_EN, type ProfileType } from "@/lib/profileTypes";

export type ContactFields = {
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  website: string;
};

const CONTACT_FIELDS: { key: keyof ContactFields; label: string; placeholder: string; type: string }[] = [
  { key: "phone", label: "Phone", placeholder: "+961 3 123 456", type: "tel" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "+961 3 123 456", type: "tel" },
  { key: "email", label: "Email", placeholder: "hello@yourbusiness.com", type: "email" },
  { key: "instagram", label: "Instagram", placeholder: "@yourbusiness", type: "text" },
  { key: "website", label: "Website", placeholder: "yourbusiness.com", type: "text" },
];

const inputCls = "w-full h-11 px-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-sm outline-none focus:border-[var(--color-primary)] transition-colors";

export function BusinessProfileForm({
  initialBusinessName,
  initialLogoUrl,
  initialType,
  initialBio,
  initialContacts,
}: {
  initialBusinessName: string | null;
  initialLogoUrl: string | null;
  initialType: ProfileType | null;
  initialBio: string | null;
  initialContacts: ContactFields;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [businessName, setBusinessName] = useState(initialBusinessName ?? "");
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [profileType, setProfileType] = useState<ProfileType | "">(initialType ?? "");
  const [bio, setBio] = useState(initialBio ?? "");
  const [contacts, setContacts] = useState<ContactFields>(initialContacts);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function touch() {
    setSaved(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    touch();
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
        body: JSON.stringify({
          business_name: businessName,
          logo_url: newLogoUrl,
          profile_type: profileType || null,
          bio,
          contacts,
        }),
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
        Shown to everyone under every event you post, and in the Connect directory.
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
            onChange={(e) => { setBusinessName(e.target.value); touch(); }}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">What best describes you?</span>
          <select
            value={profileType}
            onChange={(e) => { setProfileType(e.target.value as ProfileType | ""); touch(); }}
            className={inputCls}
          >
            <option value="">— select —</option>
            {PROFILE_TYPES.map((pt) => (
              <option key={pt} value={pt}>{PROFILE_TYPE_EN[pt]}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Short bio</span>
        <textarea
          rows={3}
          maxLength={500}
          value={bio}
          onChange={(e) => { setBio(e.target.value); touch(); }}
          placeholder="What you do, the kind of events you run, who you'd like to work with…"
          className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-sm outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
        />
      </label>

      <div className="space-y-2">
        <div className="text-sm font-medium">Contact details</div>
        <p className="text-xs text-[var(--color-muted)]">
          Fill in only what you&apos;re happy to share. Anything left empty stays hidden. Contact details are
          shown only to signed-in users on your Connect profile.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {CONTACT_FIELDS.map((f) => (
            <label key={f.key} className="block space-y-1">
              <span className="text-xs text-[var(--color-muted)]">{f.label}</span>
              <input
                type={f.type}
                value={contacts[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => { setContacts((c) => ({ ...c, [f.key]: e.target.value })); touch(); }}
                className={inputCls}
              />
            </label>
          ))}
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
