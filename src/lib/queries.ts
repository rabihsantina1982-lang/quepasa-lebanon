import { cache } from "react";
import { createClient } from "./supabase/server";
import type { EventWithRelations, CategoryRow } from "./supabase/types";
import { TAG_LABELS } from "./tags";
import { isPromoted } from "./promotions";
import { presetRange, happensDuring, APP_TIMEZONE } from "./dates";

const FALLBACK_CATEGORIES: CategoryRow[] = [
  { id: 1,  slug: "live_music",    name_i18n: { en: "Live Music" },     icon: "🎸" },
  { id: 2,  slug: "dj_performance", name_i18n: { en: "DJ Performance" }, icon: "🎧" },
  { id: 3,  slug: "sports",       name_i18n: { en: "Sports" },         icon: "⚽" },
  { id: 4,  slug: "food_drink",   name_i18n: { en: "Food & Drink" },   icon: "🍽" },
  { id: 5,  slug: "arts_culture", name_i18n: { en: "Arts & Culture" }, icon: "🎨" },
  { id: 17, slug: "theater",      name_i18n: { en: "Theater" },          icon: "🎭" },
  { id: 6,  slug: "family_kids",  name_i18n: { en: "Family & Kids" },  icon: "👨‍👩‍👧" },
  { id: 7,  slug: "nightlife",    name_i18n: { en: "Nightlife" },      icon: "🌙" },
  { id: 9,  slug: "wellness",     name_i18n: { en: "Wellness" },       icon: "🧘" },
  { id: 10, slug: "festivals",    name_i18n: { en: "Festivals" },      icon: "🎪" },
  { id: 11, slug: "conferences",  name_i18n: { en: "Conferences & Expos" },    icon: "🎤" },
  { id: 12, slug: "workshops",    name_i18n: { en: "Workshops" },      icon: "🛠" },
  { id: 13, slug: "exhibitions",  name_i18n: { en: "Exhibitions" },    icon: "🖼" },
  { id: 14, slug: "outdoor",      name_i18n: { en: "Outdoor" },        icon: "🌳" },
  { id: 15, slug: "religious",    name_i18n: { en: "Religious" },      icon: "🕌" },
  { id: 16, slug: "charity",      name_i18n: { en: "Charity" },        icon: "❤️" },
];

const SELECT = `
  *,
  category:categories(*),
  venue:venues(*),
  media:event_media(*),
  promoter:profiles!events_user_id_fkey(business_name,logo_url,display_name,avatar_url,pro_until,verified_at),
  promotions:event_promotions(kind,starts_at,ends_at)
`;

export interface FetchEventsParams {
  category?: string;
  tag?: string;
  when?: string;
  search?: string;
  governorate?: string;
  promoterId?: string;
  limit?: number;
}

export async function fetchEvents(params: FetchEventsParams = {}): Promise<EventWithRelations[]> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return [];
  }

  let q = supabase
    .from("events")
    .select(SELECT)
    .eq("status", "published")
    .order("starts_at", { ascending: true })
    .limit(params.limit ?? 200); // high limit — client-side category filter handles the rest
  if (params.governorate) {
    q = q.eq("governorate", params.governorate);
  }
  if (params.promoterId) {
    q = q.eq("user_id", params.promoterId);
  }
  // Still relevant = hasn't ended yet. Events without an end time fall
  // back to filtering on start time, so a single instant in time doesn't
  // hide an event the moment its start time passes.
  const range = presetRange(params.when, APP_TIMEZONE);
  const now = new Date();
  const from = (range && range.from > now ? range.from : now).toISOString();
  q = q.or(`ends_at.gte.${from},and(ends_at.is.null,starts_at.gte.${from})`);
  // Anything on during the range, incl. exhibitions that opened earlier.
  if (range) q = q.lte("starts_at", range.to.toISOString());
  if (params.tag) {
    q = q.contains("tags", [params.tag]);
  }

  const { data, error } = await q;
  if (error || !data) return [];
  let rows = (data as unknown as EventWithRelations[]).filter(
    (r) => (!params.category || r.category?.slug === params.category) && (!range || happensDuring(r, { from: new Date(from), to: range.to }))
  );
  if (params.search?.trim()) {
    const words = normalize(params.search).split(/\s+/).filter(Boolean);
    rows = rows.filter((r) => {
      const hay = searchText(r);
      return words.every((w) => hay.includes(w));
    });
  }
  // Boosted / spotlighted events first; otherwise keep date order (stable sort).
  return rows.sort((a, b) => Number(isPromoted(b)) - Number(isPromoted(a)));
}

// Combining accents (U+0300-036F) and Arabic harakat (U+064B-065F).
const DIACRITICS = new RegExp(
  `[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}${String.fromCharCode(0x64b)}-${String.fromCharCode(0x65f)}]`,
  "g"
);

// Lowercase, strip accents/diacritics (incl. Arabic harakat) for matching.
function normalize(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(DIACRITICS, "");
}

// Everything a visitor might type to find an event: title and description in
// every language, venue, area, category name and sub-filter labels.
function searchText(e: EventWithRelations): string {
  const parts: string[] = [
    ...Object.values(e.title_i18n ?? {}),
    ...Object.values(e.description_i18n ?? {}),
    e.venue?.name ?? "",
    e.venue?.area ?? "",
    e.venue?.city ?? "",
    ...Object.values((e.category?.name_i18n as Record<string, string> | undefined) ?? {}),
    ...(e.tags ?? []).flatMap((tag) => Object.values(TAG_LABELS[tag] ?? {})),
  ];
  return normalize(parts.join(" "));
}

// cache(): generateMetadata and the page both call this for the same slug in
// one request; only query once.
export const fetchEventBySlug = cache(async function fetchEventBySlug(slug: string): Promise<EventWithRelations | null> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return null;
  }
  const { data, error } = await supabase
    .from("events")
    .select(SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as EventWithRelations;
});

export async function fetchCategories(): Promise<CategoryRow[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("categories").select("*").order("id");
    return (data && data.length > 0) ? (data as CategoryRow[]) : FALLBACK_CATEGORIES;
  } catch {
    return FALLBACK_CATEGORIES;
  }
}
