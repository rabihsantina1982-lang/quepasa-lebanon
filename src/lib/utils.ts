import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pickLocalized(
  field: Record<string, string> | string | null | undefined,
  locale: string,
  fallback = "en"
): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field[locale] ?? field[fallback] ?? Object.values(field)[0] ?? "";
}

export function formatDateRange(
  startsAt: string | Date,
  endsAt: string | Date | null,
  locale: string,
  timeZone = "Asia/Beirut"
): string {
  const start = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  const end = endsAt ? (typeof endsAt === "string" ? new Date(endsAt) : endsAt) : null;
  const dateFmt = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone,
  });
  const timeFmt = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
  const left = `${dateFmt.format(start)} · ${timeFmt.format(start)}`;
  if (!end) return left;
  // Same day → only show end time
  if (dateFmt.format(start) === dateFmt.format(end)) {
    return `${left} – ${timeFmt.format(end)}`;
  }
  return `${left} – ${dateFmt.format(end)}`;
}

export function formatPrice(
  min: number | null,
  max: number | null,
  currency = "USD",
  locale = "en"
): string {
  if (min == null && max == null) return "";
  if (min === 0 && (max == null || max === 0)) {
    return locale === "ar" ? "مجاناً" : "Free";
  }
  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  if (min != null && (max == null || min === max)) return `${fmt(min)}`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  return fmt(max!);
}
