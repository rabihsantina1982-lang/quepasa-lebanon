"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { BirthDatePicker } from "./ui/BirthDatePicker";
import { cn } from "@/lib/utils";
import type { CategoryRow, Gender } from "@/lib/supabase/types";

const genderOptions: { value: Gender; key: string }[] = [
  { value: "male", key: "genderMale" },
  { value: "female", key: "genderFemale" },
  { value: "non_binary", key: "genderNonBinary" },
];

export function CompleteProfileDialog({ categories }: { categories: CategoryRow[] }) {
  const t = useTranslations("Onboarding");
  const tCat = useTranslations("Categories");
  const [open, setOpen] = useState(true);
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggleInterest(slug: string) {
    setInterests((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  async function submit(skip: boolean) {
    setSaving(true);
    try {
      await fetch("/api/profile/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          skip ? {} : { date_of_birth: dob || undefined, gender: gender || undefined, interests }
        ),
      });
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => submit(true)} label={t("title")}>
      <h2 className="text-xl font-semibold">{t("title")}</h2>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{t("body")}</p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">{t("dobLabel")}</label>
          <BirthDatePicker value={dob} onChange={setDob} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">{t("genderLabel")}</label>
          <div className="flex gap-2">
            {genderOptions.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGender((prev) => (prev === g.value ? "" : g.value))}
                className={cn(
                  "flex-1 h-10 rounded-full text-sm border transition-colors",
                  gender === g.value
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] border-[var(--color-primary)]"
                    : "bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-fg)]/30"
                )}
              >
                {t(g.key as never)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">{t("interestsLabel")}</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const active = interests.includes(c.slug);
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => toggleInterest(c.slug)}
                  className={cn(
                    "rounded-full px-3 h-9 text-sm border transition-colors",
                    active
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] border-[var(--color-primary)]"
                      : "bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-fg)]/30"
                  )}
                >
                  <span className="me-1" aria-hidden>{c.icon}</span>
                  {tCat(c.slug as never)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={() => submit(true)} disabled={saving}>
          {t("skip")}
        </Button>
        <Button variant="primary" className="flex-1" onClick={() => submit(false)} disabled={saving}>
          {t("save")}
        </Button>
      </div>
    </Dialog>
  );
}
