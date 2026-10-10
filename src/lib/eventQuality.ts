// Listing quality score shown to promoters: 0–100 from simple checks on what
// the event has, with a tip for each thing that's missing.

export interface QualityInput {
  media: number; // photos + videos
  description: string;
  ticketUrl?: string | null;
  bookingPhone?: string | null;
  priceKnown: boolean; // a price, or 0 for free
  venueName?: string | null;
  area?: string | null;
  hasCategory: boolean;
  hasEnd: boolean; // an end time, or several show dates
  tags: number;
}

export type QualityLevel = "good" | "fair" | "poor";

export interface QualityResult {
  score: number;
  level: QualityLevel;
  tips: string[];
}

const MIN_DESCRIPTION = 150;

const CHECKS: { points: number; ok: (e: QualityInput) => boolean; tip: string }[] = [
  { points: 25, ok: (e) => e.media > 0, tip: "Add at least one photo or video. Listings without a picture are easy to scroll past." },
  { points: 20, ok: (e) => !!(e.ticketUrl?.trim() || e.bookingPhone?.trim()), tip: "Add a ticket link or booking phone so people can book." },
  { points: 15, ok: (e) => e.description.trim().length >= MIN_DESCRIPTION, tip: `Describe the event in a few sentences (at least ${MIN_DESCRIPTION} characters): who, what, and why go.` },
  { points: 10, ok: (e) => e.priceKnown, tip: "Add a price, or 0 if it's free." },
  { points: 10, ok: (e) => !!(e.venueName?.trim() && e.area?.trim()), tip: "Add both the venue and the area." },
  { points: 10, ok: (e) => e.hasCategory, tip: "Pick a category so people browsing it can find you." },
  { points: 5, ok: (e) => e.hasEnd, tip: "Add an end time." },
  { points: 5, ok: (e) => e.tags > 0, tip: "Add a tag or two (for example outdoor or family)." },
];

export function eventQuality(e: QualityInput): QualityResult {
  let score = 0;
  const tips: string[] = [];
  for (const c of CHECKS) {
    if (c.ok(e)) score += c.points;
    else tips.push(c.tip);
  }
  return { score, level: score >= 80 ? "good" : score >= 50 ? "fair" : "poor", tips };
}

export const QUALITY_LABEL: Record<QualityLevel, string> = { good: "Great", fair: "Could be better", poor: "Needs work" };

// Tailwind classes for the coloured dot / pill.
export const QUALITY_COLOR: Record<QualityLevel, string> = {
  good: "bg-green-100 text-green-800",
  fair: "bg-amber-100 text-amber-800",
  poor: "bg-red-100 text-red-800",
};
