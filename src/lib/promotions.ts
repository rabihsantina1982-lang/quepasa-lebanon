import type { EventPromotion } from "./supabase/types";

export type PromotionKind = EventPromotion["kind"];

function isActive(p: EventPromotion, now: number): boolean {
  return new Date(p.starts_at).getTime() <= now && new Date(p.ends_at).getTime() > now;
}

// Whether an event currently has a promotion of the given kind (any kind if omitted).
export function isPromoted(event: { promotions?: EventPromotion[] | null }, kind?: PromotionKind): boolean {
  const now = Date.now();
  return (event.promotions ?? []).some((p) => (!kind || p.kind === kind) && isActive(p, now));
}

// Latest end date of the event's active promotions of a kind, or null.
export function promotedUntil(event: { promotions?: EventPromotion[] | null }, kind: PromotionKind): Date | null {
  const now = Date.now();
  const ends = (event.promotions ?? [])
    .filter((p) => p.kind === kind && new Date(p.ends_at).getTime() > now)
    .map((p) => new Date(p.ends_at).getTime());
  return ends.length ? new Date(Math.max(...ends)) : null;
}

export function isPro(profile: { pro_until?: string | null } | null | undefined): boolean {
  return !!profile?.pro_until && new Date(profile.pro_until).getTime() > Date.now();
}
