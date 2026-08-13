"use client";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";

const labels: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  fr: "Français",
};

export function LocaleSwitcher() {
  const current = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <select
      aria-label="Language"
      value={current}
      onChange={(e) => router.replace(pathname, { locale: e.target.value as Locale })}
      className="h-9 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm"
    >
      {locales.map((l) => (
        <option key={l} value={l}>{labels[l]}</option>
      ))}
    </select>
  );
}
