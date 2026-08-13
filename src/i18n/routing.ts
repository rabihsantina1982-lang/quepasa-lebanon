import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ar", "fr"] as const;
export type Locale = (typeof locales)[number];

export const rtlLocales: Locale[] = ["ar"];

export function isRtl(locale: string): boolean {
  return (rtlLocales as string[]).includes(locale);
}

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
});
