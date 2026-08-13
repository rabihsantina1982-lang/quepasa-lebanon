/**
 * Ticketmaster Discovery API → QuePasa ingestion helpers
 *
 * API docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 * Auth: API key via TICKETMASTER_API_KEY env var (free at developer.ticketmaster.com)
 */

import { createAdminClient } from "./supabase/admin";

// ---------------------------------------------------------------------------
// Ticketmaster segment/genre → our category slug
// ---------------------------------------------------------------------------
const TM_SEGMENT_MAP: Record<string, string> = {
  "KZFzniwnSyZfZ7v7nJ": "live_music",      // Music
  "KZFzniwnSyZfZ7v7nE": "sports",          // Sports
  "KZFzniwnSyZfZ7v7na": "arts_culture",    // Arts & Theatre
  "KZFzniwnSyZfZ7v7nn": "family_kids",     // Family
  "KZFzniwnSyZfZ7v7n1": "festivals",       // Miscellaneous
};

const TM_GENRE_MAP: Record<string, string> = {
  "KnvZfZ7vAvF": "dj_performance",   // Electronic
  "KnvZfZ7vAeA": "dj_performance",   // Dance/Electronic
  "KnvZfZ7vAv1": "live_music",       // Pop
  "KnvZfZ7vAeI": "live_music",       // Rock
  "KnvZfZ7vAev": "live_music",       // R&B
  "KnvZfZ7vAvt": "live_music",       // Hip-Hop/Rap
  "KnvZfZ7vAJ6": "live_music",       // Classical
  "KnvZfZ7vAaa": "live_music",       // Jazz
  "KnvZfZ7vAF6": "live_music",       // World
  "KnvZfZ7vAe6": "nightlife",        // Comedy/Cabaret
  "KnvZfZ7vAaA": "wellness",         // Health/Wellness
  "KnvZfZ7vAeJ": "outdoor",          // Outdoor
};

// ---------------------------------------------------------------------------
// Raw Ticketmaster API shapes (only the fields we use)
// ---------------------------------------------------------------------------
interface TMVenue {
  id: string;
  name: string;
  city?: { name: string };
  state?: { name: string };
  country?: { countryCode: string };
  location?: { latitude: string; longitude: string };
  address?: { line1: string };
  postalCode?: string;
}

interface TMEvent {
  id: string;
  name: string;
  url: string;
  dates: {
    start: { localDate: string; localTime?: string; dateTime?: string };
    end?: { localDate?: string; localTime?: string; dateTime?: string };
    timezone?: string;
  };
  images?: { url: string; width: number; height: number; ratio?: string }[];
  classifications?: {
    segment?: { id: string; name: string };
    genre?: { id: string; name: string };
    subGenre?: { id: string; name: string };
  }[];
  priceRanges?: { min: number; max: number; currency: string }[];
  _embedded?: { venues?: TMVenue[] };
  info?: string;
  pleaseNote?: string;
}

interface TMSearchResponse {
  _embedded?: { events: TMEvent[] };
  page: { totalElements: number; totalPages: number; number: number; size: number };
}

// ---------------------------------------------------------------------------
// Derive emirate from venue city/state text
// ---------------------------------------------------------------------------
function deriveEmirate(venue: TMVenue | undefined): string {
  const text = [venue?.city?.name, venue?.state?.name, venue?.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("abu dhabi") || text.includes("abu_dhabi")) return "abu_dhabi";
  if (text.includes("sharjah")) return "sharjah";
  if (text.includes("ajman")) return "ajman";
  if (text.includes("fujairah")) return "fujairah";
  if (text.includes("ras al khaimah") || text.includes("ras-al-khaimah")) return "ras_al_khaimah";
  if (text.includes("umm al quwain")) return "umm_al_quwain";
  return "dubai";
}

// ---------------------------------------------------------------------------
// Pick the best image from Ticketmaster images array
// ---------------------------------------------------------------------------
function pickBestImage(images: TMEvent["images"]): string | null {
  if (!images || images.length === 0) return null;
  // Prefer 16_9 ratio, largest width
  const sorted = [...images]
    .filter((i) => i.ratio === "16_9" || !i.ratio)
    .sort((a, b) => b.width - a.width);
  return sorted[0]?.url ?? images[0]?.url ?? null;
}

// ---------------------------------------------------------------------------
// Resolve category
// ---------------------------------------------------------------------------
function resolveCategory(
  event: TMEvent,
  categorySlugToId: Map<string, number>
): number | null {
  const cls = event.classifications?.[0];
  // Genre-level first (more specific)
  const genreSlug = cls?.genre?.id ? TM_GENRE_MAP[cls.genre.id] : null;
  if (genreSlug) return categorySlugToId.get(genreSlug) ?? null;
  // Segment-level fallback
  const segSlug = cls?.segment?.id ? TM_SEGMENT_MAP[cls.segment.id] : null;
  if (segSlug) return categorySlugToId.get(segSlug) ?? null;
  return null;
}

// ---------------------------------------------------------------------------
// Slugify
// ---------------------------------------------------------------------------
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ---------------------------------------------------------------------------
// Find or create venue
// ---------------------------------------------------------------------------
async function findOrCreateVenue(
  supabase: ReturnType<typeof createAdminClient>,
  venue: TMVenue
): Promise<string | null> {
  const city = venue.city?.name ?? "Dubai";
  const name = venue.name;

  const { data: existing } = await supabase
    .from("venues")
    .select("id")
    .eq("name", name)
    .eq("city", city)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("venues")
    .insert({
      name,
      city,
      address: venue.address?.line1 ?? null,
      lat: venue.location?.latitude ? parseFloat(venue.location.latitude) : null,
      lng: venue.location?.longitude ? parseFloat(venue.location.longitude) : null,
    })
    .select("id")
    .maybeSingle();

  return created?.id ?? null;
}

// ---------------------------------------------------------------------------
// Main ingestion function
// ---------------------------------------------------------------------------
export interface IngestionResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export async function ingestFromTicketmaster(
  apiKey: string,
  options: { maxPages?: number } = {}
): Promise<IngestionResult> {
  const { maxPages = 5 } = options;
  const supabase = createAdminClient();
  const result: IngestionResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };

  // Load category map
  const { data: cats } = await supabase.from("categories").select("id, slug");
  const categorySlugToId = new Map<string, number>(
    (cats ?? []).map((c) => [c.slug, c.id])
  );

  for (let page = 0; page < maxPages; page++) {
    let pageData: TMSearchResponse;
    try {
      const params = new URLSearchParams({
        apikey: apiKey,
        countryCode: "AE",
        size: "50",
        page: String(page),
        sort: "date,asc",
      });

      const res = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?${params}`,
        { signal: AbortSignal.timeout(10_000) }
      );

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        result.errors.push(`Page ${page} fetch failed: ${res.status} ${body.slice(0, 200)}`);
        break;
      }
      pageData = await res.json() as TMSearchResponse;
    } catch (err) {
      result.errors.push(`Page ${page} fetch failed: ${String(err)}`);
      break;
    }

    const events = pageData._embedded?.events ?? [];
    if (events.length === 0) break;

    for (const ev of events) {
      try {
        await processTMEvent(ev, supabase, categorySlugToId, result);
      } catch (err) {
        result.errors.push(`Event ${ev.id}: ${String(err)}`);
      }
    }

    if (page >= (pageData.page.totalPages - 1)) break;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Process one Ticketmaster event
// ---------------------------------------------------------------------------
async function processTMEvent(
  ev: TMEvent,
  supabase: ReturnType<typeof createAdminClient>,
  categorySlugToId: Map<string, number>,
  result: IngestionResult
): Promise<void> {
  const venue = ev._embedded?.venues?.[0];

  // Only UAE events
  if (venue?.country?.countryCode && venue.country.countryCode !== "AE") {
    result.skipped++;
    return;
  }

  const emirate = deriveEmirate(venue);
  let venueId: string | null = null;
  if (venue) venueId = await findOrCreateVenue(supabase, venue);

  const sourceUrl = ev.url;
  const baseSlug = `tm-${slugify(ev.name)}`;

  const startsAt = ev.dates.start.dateTime ?? `${ev.dates.start.localDate}T${ev.dates.start.localTime ?? "20:00:00"}`;
  const endsAt = ev.dates.end?.dateTime ?? null;

  const price = ev.priceRanges?.[0];
  const description = [ev.info, ev.pleaseNote].filter(Boolean).join(" ").slice(0, 2000) || "";

  const payload = {
    slug: baseSlug,
    title_i18n: { en: ev.name },
    description_i18n: { en: description },
    category_id: resolveCategory(ev, categorySlugToId),
    venue_id: venueId,
    starts_at: startsAt,
    ends_at: endsAt,
    timezone: ev.dates.timezone ?? "Asia/Dubai",
    cover_image: pickBestImage(ev.images),
    price_min: price?.min ?? null,
    price_max: price?.max ?? null,
    currency: price?.currency ?? "AED",
    ticket_url: sourceUrl,
    status: "published" as const,
    source: "ticketmaster",
    source_url: sourceUrl,
    emirate,
  };

  const { data: existing } = await supabase
    .from("events")
    .select("id, slug")
    .eq("source_url", sourceUrl)
    .maybeSingle();

  if (existing) {
    await supabase.from("events").update({ ...payload, slug: existing.slug }).eq("id", existing.id);
    result.updated++;
  } else {
    const { error } = await supabase.from("events").insert(payload);
    if (error?.code === "23505") {
      await supabase.from("events").insert({ ...payload, slug: `${baseSlug}-${ev.id}` });
    } else if (error) {
      throw new Error(error.message);
    }
    result.inserted++;
  }
}
