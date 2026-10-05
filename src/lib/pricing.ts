// Prices for paid visibility. Listing events is free and unlimited.
// Change the numbers here and every page that shows a price follows.

export const PRICING = {
  currency: "$",
  boostPerWeek: 15,
  spotlightPerWeek: 35,
  proPerMonth: 25,
  // Free boost weeks included with Pro each calendar month.
  proFreeBoostsPerMonth: 1,
  // Newly approved promoters get Pro free for this many months.
  proWelcomeMonths: 3,
} as const;

export function price(amount: number): string {
  return `${PRICING.currency}${amount}`;
}
