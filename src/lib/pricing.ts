// Prices for paid visibility. Listing events is free and unlimited.
// Change the numbers here and every page that shows a price follows.

export const PRICING = {
  currency: "$",
  // ISO code used for card payments (Stripe).
  currencyCode: "usd",
  boostPerWeek: 15,
  spotlightPerWeek: 35,
  proPerMonth: 25,
  // Free boost weeks included with Pro each calendar month.
  proFreeBoostsPerMonth: 1,
  // Newly approved promoters get Pro free for this many months.
  proWelcomeMonths: 3,
} as const;

// How many events can hold each kind of promotion on the same day. The
// homepage banner shows 5 at a time; boosts are capped so pinned events stay
// worth paying for.
export const SLOTS = {
  boost: 10,
  spotlight: 5,
} as const;

// How far ahead promoters can book a boost or spotlight.
export const BOOK_AHEAD_DAYS = 90;

export type PaidKind = "boost" | "spotlight" | "pro";

export function unitPrice(kind: PaidKind): number {
  return kind === "boost" ? PRICING.boostPerWeek : kind === "spotlight" ? PRICING.spotlightPerWeek : PRICING.proPerMonth;
}

export function price(amount: number): string {
  return `${PRICING.currency}${amount}`;
}
