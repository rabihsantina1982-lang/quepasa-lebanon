// English labels for the promoter dashboard's traffic breakdown (the
// promoter area is English-only). Values come from event_activity.source,
// .locale and .device.

export const SOURCE_LABELS: Record<string, string> = {
  browse: "QuePasa Browse",
  boost: "Boost (top of Browse)",
  spotlight: "Homepage spotlight",
  quepasa: "Other QuePasa pages",
  whatsapp: "WhatsApp",
  shared_link: "Shared link",
  google: "Google",
  instagram: "Instagram",
  facebook: "Facebook",
  other_site: "Other websites",
  direct: "Direct / typed in",
};

export const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  ar: "Arabic",
  hi: "Hindi",
  ur: "Urdu",
  ru: "Russian",
  es: "Spanish",
  fr: "French",
  it: "Italian",
  ja: "Japanese",
  tl: "Filipino",
  zh: "Chinese",
};

export const DEVICE_LABELS: Record<string, string> = {
  mobile: "Phone",
  tablet: "Tablet",
  desktop: "Computer",
};

export type TrafficRow = { event_id: string | null; dimension: "source" | "language" | "device"; bucket: string; visits: number };

export const TRAFFIC_MINIMUM = 10;

// Rows for one dimension, largest first, with share of the total.
export function breakdown(rows: TrafficRow[], eventId: string | null, dimension: TrafficRow["dimension"]) {
  const labels = dimension === "source" ? SOURCE_LABELS : dimension === "language" ? LANGUAGE_LABELS : DEVICE_LABELS;
  const items = rows
    .filter((r) => r.event_id === eventId && r.dimension === dimension)
    .map((r) => ({ label: labels[r.bucket] ?? r.bucket, n: Number(r.visits) }))
    .sort((a, b) => b.n - a.n);
  const total = items.reduce((s, i) => s + i.n, 0);
  return { items, total };
}
