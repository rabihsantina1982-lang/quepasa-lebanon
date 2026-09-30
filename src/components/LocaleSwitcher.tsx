"use client";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";

const labels: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  fr: "Français",
};

// Shown on phones, where the header has no room for full names.
const shortLabels: Record<Locale, string> = {
  en: "EN",
  ar: "ع",
  fr: "FR",
};

export function LocaleSwitcher() {
  const current = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  // On phones the closed picker shows a short code for the current language;
  // the open list still shows full names.
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <select
      aria-label="Language"
      value={current}
      onChange={(e) => router.replace(pathname, { locale: e.target.value as Locale })}
      className="h-9 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] w-14 sm:w-auto px-2 sm:px-3 text-sm"
    >
      {locales.map((l) => (
        <option key={l} value={l}>{l === current && compact ? shortLabels[l] : labels[l]}</option>
      ))}
    </select>
  );
}
