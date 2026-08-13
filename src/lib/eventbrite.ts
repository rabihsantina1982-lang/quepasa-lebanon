/**
 * Eventbrite → QuePasa ingestion helpers
 *
 * Eventbrite API docs: https://www.eventbrite.com/platform/api
 * Auth: Bearer token via EVENTBRITE_API_KEY env var
 */

import { createAdminClient } from "./supabase/admin";

// ---------------------------------------------------------------------------
// Eventbrite category ID → our category slug
// ---------------------------------------------------------------------------
const EB_CATEGORY_MAP: Record<string, string> = {
  "103": "live_music",       // Music
  "104": "business",         // Business & Professional
  "105": "food_drink",       // Food & Drink
  "106": "arts_culture",     // Community & Culture
  "107": "arts_culture",     // Performing & Visual Arts
  "108": "festivals",        // Film, Media & Entertainment
  "109": "sports",           // Sports & Fitness
  "110": "wellness",         // Health & Wellness
  "111": "conferences",      // Science & Technology
  "112": "outdoor",          // Travel & Outdoor
  "113": "charity",          // Charity & Causes
  "114": "religious",        // Religion & Spirituality
  "115": "family_kids",      // Family & Education
  "116": "festivals",        // Seasonal & Holiday
  "117": "business",         // Government & Politics
  "118": "arts_culture",     // Fashion & Beauty
  "119": "wellness",         // Home & Lifestyle
  "199": "festivals",        // Other
};

// ---------------------------------------------------------------------------
// Eventbrite subcategory hints for DJ / nightlife disambiguation
// ---------------------------------------------------------------------------
const DJ_SUBCATEGORY_IDS = new Set(["3.4", "3.5"]); // Electronic & Dance

// ---------------------------------------------------------------------------
// Raw Eventbrite API shapes (only the fields we use)
// ---------------------------------------------------------------------------
interface EBMultipartText {
  text: string | null;
  html: string | null;
}

interface EBVenue {
  id: string;
  name: string | null;
  address: {
    address_1: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
    latitude: string | null;
    longitude: string | null;
    localized_area_display: string | null;
  } | null;
}

interface EBEvent {
  id: string;
  name: EBMultipartText;
  description: EBMultipartText;
  start: { utc: string; local: string; timezone: string };
  end: { utc: string; local: string; timezone: string };
  url: string;
  logo?: { url: string | null } | null;
  category_id: string | null;
  subcategory_id: string | null;
  is_free: boolean;
  ticket_availability?: {
    minimum_ticket_price?: { major_value: string } | null;
    maximum_ticket_price?: { major_value: string } | null;
  } | null;
  venue_id: string | null;
  venue?: EBVenue | null;
  status: string; // "live" | "started" | "ended" | "canceled" | "draft"
  currency: string;
  governorate_hint?: string | null; // not in EB, we'll derive it
}

interface EBSearchResponse {
  events: EBEvent[];
  pagination: {
    page_number: number;
    page_count: number;
    has_more_items: boolean;
    continuation?: string;
  };
}

// ---------------------------------------------------------------------------
// Fetch a single page from Eventbrite event search
// ---------------------------------------------------------------------------
async function fetchEBPage(
  apiKey: string,
  locationAddress: string,
  withinKm: number,
  page: number,
  continuation?: string
): Promise<EBSearchResponse> {
  const params = new URLSearchParams({
    "location.address": locationAddress,
    "location.within": `${withinKm}km`,
    "expand": "venue,ticket_availability,category",
    "status": "live",
    "page": String(page),
    "page_size": "50",
    "sort_by": "date",
  });
  if (continuation) {
    params.set("continuation", continuation);
  }

  const res = await fetch(
    `https://www.eventbriteapi.com/v3/events/search/?${params}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      // 10s timeout
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Eventbrite API ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<EBSearchResponse>;
}

// ---------------------------------------------------------------------------
// Derive governorate from city / address text
// ---------------------------------------------------------------------------
function deriveGovernorate(venue: EBVenue | null | undefined): string {
  const text = [
    venue?.address?.city,
    venue?.address?.region,
    venue?.address?.address_1,
    venue?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("tripoli") || text.includes("zgharta") || text.includes("batroun") || text.includes("koura")) return "north_lebanon";
  if (text.includes("akkar")) return "akkar";
  if (text.includes("baalbek") || text.includes("hermel")) return "baalbek_hermel";
  if (text.includes("zahle") || text.includes("bekaa") || text.includes("beqaa")) return "bekaa";
  if (text.includes("nabatieh") || text.includes("nabatiyeh")) return "nabatieh";
  if (text.includes("saida") || text.includes("sidon") || text.includes("tyre") || text.includes("sour")) return "south_lebanon";
  if (text.includes("jounieh") || text.includes("byblos") || text.includes("jbeil") || text.includes("baabda") || text.includes("aley") || text.includes("chouf")) return "mount_lebanon";
  // Default to Beirut
  return "beirut";
}

// ---------------------------------------------------------------------------
// Map one Eventbrite event to our category_id (requires a DB lookup map)
// ---------------------------------------------------------------------------
function resolveCategoryId(
  eb: EBEvent,
  categorySlugToId: Map<string, number>
): number | null {
  // Subcategory override: Electronic/Dance → dj_performance
  if (eb.subcategory_id && DJ_SUBCATEGORY_IDS.has(eb.subcategory_id)) {
    return categorySlugToId.get("dj_performance") ?? null;
  }

  const slug = eb.category_id ? EB_CATEGORY_MAP[eb.category_id] : null;
  if (!slug) return null;
  return categorySlugToId.get(slug) ?? null;
}

// ---------------------------------------------------------------------------
// Slugify a string (safe for DB slug column)
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
// Find-or-create a venue and return its UUID
// Venues has no unique constraint on (name, city), so we do select-first.
// ---------------------------------------------------------------------------
async function upsertVenue(
  supabase: ReturnType<typeof createAdminClient>,
  eb: EBVenue
): Promise<string | null> {
  const city = eb.address?.city ?? "Beirut";
  const name = eb.name ?? "Unknown Venue";

  // Check if a venue with this name+city already exists
  const { data: existing } = await supabase
    .from("venues")
    .select("id")
    .eq("name", name)
    .eq("city", city)
    .maybeSingle();

  if (existing) return existing.id;

  // Insert new venue
  const { data: created, error } = await supabase
    .from("venues")
    .insert({
      name,
      address: eb.address?.address_1 ?? null,
      city,
      area: eb.address?.localized_area_display ?? null,
      lat: eb.address?.latitude ? parseFloat(eb.address.latitude) : null,
      lng: eb.address?.longitude ? parseFloat(eb.address.longitude) : null,
    })
    .select("id")
    .maybeSingle();

  if (error || !created) return null;
  return created.id;
}

// ---------------------------------------------------------------------------
// Main ingestion function — call from the API route
// ---------------------------------------------------------------------------
export interface IngestionResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export async function ingestFromEventbrite(
  apiKey: string,
  options: {
    locationAddress?: string;
    withinKm?: number;
    maxPages?: number;
  } = {}
): Promise<IngestionResult> {
  const {
    locationAddress = "Beirut, Lebanon",
    withinKm = 120, // covers all of Lebanon's governorates
    maxPages = 5,
  } = options;

  const supabase = createAdminClient();
  const result: IngestionResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };

  // 1. Load our category slug→id map
  const { data: cats } = await supabase.from("categories").select("id, slug");
  const categorySlugToId = new Map<string, number>(
    (cats ?? []).map((c) => [c.slug, c.id])
  );

  // 2. Paginate Eventbrite results
  let page = 1;
  let continuation: string | undefined;

  while (page <= maxPages) {
    let pageData: EBSearchResponse;
    try {
      pageData = await fetchEBPage(apiKey, locationAddress, withinKm, page, continuation);
    } catch (err) {
      result.errors.push(`Page ${page} fetch failed: ${String(err)}`);
      break;
    }

    // 3. Process each event
    for (const eb of pageData.events) {
      try {
        await processEvent(eb, supabase, categorySlugToId, result);
      } catch (err) {
        result.errors.push(`Event ${eb.id}: ${String(err)}`);
      }
    }

    if (!pageData.pagination.has_more_items) break;
    continuation = pageData.pagination.continuation;
    page++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Process a single Eventbrite event into our DB
// ---------------------------------------------------------------------------
async function processEvent(
  eb: EBEvent,
  supabase: ReturnType<typeof createAdminClient>,
  categorySlugToId: Map<string, number>,
  result: IngestionResult
): Promise<void> {
  // Skip ended / canceled
  if (eb.status === "ended" || eb.status === "canceled") {
    result.skipped++;
    return;
  }

  // Skip events outside Lebanon
  const country = eb.venue?.address?.country?.toUpperCase();
  if (country && country !== "LB") {
    result.skipped++;
    return;
  }

  const sourceUrl = eb.url;
  const governorate = deriveGovernorate(eb.venue);

  // Upsert venue if present
  let venueId: string | null = null;
  if (eb.venue) {
    venueId = await upsertVenue(supabase, eb.venue);
  }

  // Build slug — prefix with "eb-" to avoid collisions with manual events
  const baseSlug = `eb-${slugify(eb.name.text ?? eb.id)}`;

  // Pricing
  const isFree = eb.is_free;
  const priceMin = isFree
    ? 0
    : eb.ticket_availability?.minimum_ticket_price?.major_value
    ? parseFloat(eb.ticket_availability.minimum_ticket_price.major_value)
    : null;
  const priceMax = eb.ticket_availability?.maximum_ticket_price?.major_value
    ? parseFloat(eb.ticket_availability.maximum_ticket_price.major_value)
    : null;

  const eventPayload = {
    slug: baseSlug,
    title_i18n: { en: eb.name.text ?? "Untitled" },
    description_i18n: eb.description.text
      ? { en: eb.description.text.slice(0, 2000) }
      : { en: "" },
    category_id: resolveCategoryId(eb, categorySlugToId),
    venue_id: venueId,
    starts_at: eb.start.utc,
    ends_at: eb.end.utc,
    timezone: eb.start.timezone ?? "Asia/Beirut",
    cover_image: eb.logo?.url ?? null,
    price_min: priceMin,
    price_max: priceMax,
    currency: eb.currency ?? "USD",
    ticket_url: sourceUrl,
    status: "published" as const,
    source: "eventbrite",
    source_url: sourceUrl,
    governorate,
  };

  // Check if already exists by source_url
  const { data: existing } = await supabase
    .from("events")
    .select("id, slug")
    .eq("source_url", sourceUrl)
    .maybeSingle();

  if (existing) {
    // Update existing record (keep its slug)
    const { error } = await supabase
      .from("events")
      .update({ ...eventPayload, slug: existing.slug })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    result.updated++;
  } else {
    // Insert new — handle slug collisions by appending EB id suffix
    const { error } = await supabase
      .from("events")
      .insert({ ...eventPayload })
      .single();

    if (error?.code === "23505") {
      // Unique constraint violation on slug — try with eb id suffix
      const { error: error2 } = await supabase
        .from("events")
        .insert({ ...eventPayload, slug: `${baseSlug}-${eb.id}` });
      if (error2) throw new Error(error2.message);
    } else if (error) {
      throw new Error(error.message);
    }
    result.inserted++;
  }
}
