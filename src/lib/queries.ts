import { createClient } from "./supabase/server";
import { startOfDay, endOfDay, addDays, nextSaturday, nextSunday, endOfWeek } from "date-fns";
import type { EventWithRelations, CategoryRow } from "./supabase/types";

const FALLBACK_CATEGORIES: CategoryRow[] = [
  { id: 1,  slug: "live_music",    name_i18n: { en: "Live Music" },     icon: "🎸" },
  { id: 16, slug: "dj_performance", name_i18n: { en: "DJ Performance" }, icon: "🎧" },
  { id: 2,  slug: "sports",       name_i18n: { en: "Sports" },         icon: "⚽" },
  { id: 3,  slug: "food_drink",   name_i18n: { en: "Food & Drink" },   icon: "🍽" },
  { id: 4,  slug: "arts_culture", name_i18n: { en: "Arts & Culture" }, icon: "🎭" },
  { id: 5,  slug: "family_kids",  name_i18n: { en: "Family & Kids" },  icon: "👨‍👩‍👧" },
  { id: 6,  slug: "nightlife",    name_i18n: { en: "Nightlife" },      icon: "🌙" },
  { id: 7,  slug: "business",     name_i18n: { en: "Business" },       icon: "💼" },
  { id: 8,  slug: "wellness",     name_i18n: { en: "Wellness" },       icon: "🧘" },
  { id: 9,  slug: "festivals",    name_i18n: { en: "Festivals" },      icon: "🎪" },
  { id: 10, slug: "conferences",  name_i18n: { en: "Conferences" },    icon: "🎤" },
  { id: 11, slug: "workshops",    name_i18n: { en: "Workshops" },      icon: "🛠" },
  { id: 12, slug: "exhibitions",  name_i18n: { en: "Exhibitions" },    icon: "🖼" },
  { id: 13, slug: "outdoor",      name_i18n: { en: "Outdoor" },        icon: "🌳" },
  { id: 14, slug: "religious",    name_i18n: { en: "Religious" },      icon: "🕌" },
  { id: 15, slug: "charity",      name_i18n: { en: "Charity" },        icon: "❤️" },
];

const SELECT = `
  *,
  category:categories(*),
  venue:venues(*),
  media:event_media(*)
`;

export interface FetchEventsParams {
  category?: string;
  when?: string;
  search?: string;
  governorate?: string;
  limit?: number;
}

function dateRangeForPreset(preset: string | undefined, tz = "Asia/Beirut"): { from: Date; to: Date } | null {
  const now = new Date();
  switch (preset) {
    case "today": return { from: startOfDay(now), to: endOfDay(now) };
    case "tomorrow": return { from: startOfDay(addDays(now, 1)), to: endOfDay(addDays(now, 1)) };
    case "thisWeekend": return { from: startOfDay(nextSaturday(now)), to: endOfDay(nextSunday(now)) };
    case "thisWeek": return { from: now, to: endOfWeek(now, { weekStartsOn: 1 }) };
    default: return null;
  }
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
  const range = dateRangeForPreset(params.when);
  if (range) {
    q = q.gte("starts_at", range.from.toISOString()).lte("starts_at", range.to.toISOString());
  } else {
    // Still relevant = hasn't ended yet. Events without an end time fall
    // back to filtering on start time, so a single instant in time doesn't
    // hide an event the moment its start time passes.
    const now = new Date().toISOString();
    q = q.or(`ends_at.gte.${now},and(ends_at.is.null,starts_at.gte.${now})`);
  }
  if (params.search) {
    // search across English title — Postgres ilike against jsonb text
    q = q.ilike("title_i18n->>en", `%${params.search}%`);
  }

  const { data, error } = await q;
  if (error || !data) return [];
  const rows = (data as unknown as EventWithRelations[]).filter(
    (r) => !params.category || r.category?.slug === params.category
  );
  return rows;
}

export async function fetchEventBySlug(slug: string): Promise<EventWithRelations | null> {
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
}

export async function fetchCategories(): Promise<CategoryRow[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("categories").select("*").order("id");
    return (data && data.length > 0) ? (data as CategoryRow[]) : FALLBACK_CATEGORIES;
  } catch {
    return FALLBACK_CATEGORIES;
  }
}
