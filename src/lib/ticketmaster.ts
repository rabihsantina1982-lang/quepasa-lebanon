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
  "KnvZfZ7vAvF": "dj_performance",   // Dance/Electronic
  "KnvZfZ7vAeA": "live_music",       // Rock
  "KnvZfZ7v7l1": "theater",          // Theatre
  "KnvZfZ7v7nI": "theater",          // Dance (e.g. Riverdance)
  "KnvZfZ7vAe1": "theater",          // Comedy (Arts & Theatre segment)
  "KnvZfZ7vAA1": "theater",          // Comedy (Miscellaneous segment)
  "KnvZfZ7vAv1": "live_music",       // Pop
  "KnvZfZ7vAeI": "live_music",       // Rock
  "KnvZfZ7vAev": "live_music",       // R&B
  "KnvZfZ7vAvt": "live_music",       // Hip-Hop/Rap
  "KnvZfZ7vAJ6": "live_music",       // Classical
  "KnvZfZ7vAaa": "live_music",       // Jazz
  "KnvZfZ7vAF6": "live_music",       // World
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
// Derive governorate from venue city/state text
// ---------------------------------------------------------------------------
function deriveGovernorate(venue: TMVenue | undefined): string {
  const text = [venue?.city?.name, venue?.state?.name, venue?.name]
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
  if (text.includes("beirut")) return "beirut";
  return "beirut";
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
const THEATRE_GENRE_ID = "KnvZfZ7v7l1";
const THEATER_TITLE_RE = /\b(musical|ballet|theatre|theater)\b/i;
const CONCERT_TITLE_RE = /\b(concert|orchestra|symphony|live)\b/i;
// Combat sports are sometimes filed under "Arts & Theatre" (e.g. PFL Dubai).
const FIGHT_TITLE_RE = /\b(UFC|PFL|MMA|boxing|fight night|power slap)\b/i;

function resolveCategory(
  event: TMEvent,
  categorySlugToId: Map<string, number>
): number | null {
  const cls = event.classifications?.[0];
  // Ticketmaster's labels are loose (Chicago the Musical is filed under
  // "Comedy"; Hans Zimmer and Andrea Bocelli concerts under "Theatre"), so
  // a few title checks come first.
  if (FIGHT_TITLE_RE.test(event.name)) return categorySlugToId.get("sports") ?? null;
  if (THEATER_TITLE_RE.test(event.name)) return categorySlugToId.get("theater") ?? null;
  // Genre-level next (more specific than segment)
  let genreSlug = cls?.genre?.id ? TM_GENRE_MAP[cls.genre.id] : null;
  if (genreSlug === "theater" && cls?.genre?.id === THEATRE_GENRE_ID && CONCERT_TITLE_RE.test(event.name)) {
    genreSlug = "live_music";
  }
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
  const city = venue.city?.name ?? "Beirut";
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
  hidden?: number;
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

  // Ticketmaster lists every performance of a show (e.g. each night of a
  // musical) as its own event. Collect all pages first, then save one row per
  // show with its performances in `showtimes`, instead of one row each.
  const allEvents: TMEvent[] = [];
  let fetchedAllPages = false;

  for (let page = 0; page < maxPages; page++) {
    let pageData: TMSearchResponse;
    try {
      const params = new URLSearchParams({
        apikey: apiKey,
        countryCode: "LB",
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
    if (events.length === 0) {
      fetchedAllPages = true;
      break;
    }

    allEvents.push(...events);

    if (page >= (pageData.page.totalPages - 1)) {
      fetchedAllPages = true;
      break;
    }
  }

  const seenSourceUrls = new Set<string>();
  for (const group of groupPerformances(allEvents)) {
    seenSourceUrls.add(seriesKeyFor(group));
    group.forEach((p) => seenSourceUrls.add(p.url));
    try {
      await processTMShow(group, supabase, categorySlugToId, result);
    } catch (err) {
      result.errors.push(`Event ${group[0].id}: ${String(err)}`);
    }
  }

  // Ticketmaster drops listings that are cancelled or moved to new dates.
  // Hide (not delete) our not-yet-started copies of anything no longer
  // listed -- but only after a complete, error-free fetch, so a partial or
  // failed run can never hide real events.
  if (fetchedAllPages && result.errors.length === 0) {
    const { data: upcoming } = await supabase
      .from("events")
      .select("id, source_url")
      .eq("source", "ticketmaster")
      .eq("status", "published")
      .gt("starts_at", new Date().toISOString());
    const vanished = (upcoming ?? []).filter((e) => e.source_url && !seenSourceUrls.has(e.source_url)).map((e) => e.id);
    if (vanished.length) {
      await supabase.from("events").update({ status: "draft" }).in("id", vanished);
      result.hidden = vanished.length;
    }
  }

  return result;
}

function tmStartsAt(ev: TMEvent): string {
  return ev.dates.start.dateTime ?? `${ev.dates.start.localDate}T${ev.dates.start.localTime ?? "20:00:00"}`;
}

// Ticketmaster also splits one event into a listing per seating area or
// package ("F1 ... Grand Prix - North Grandstand", "... - Club 58") or per
// day ("... Upgrade - Thursday"). Strip a trailing " - <option>" to get the
// shared name. Only a dash counts: "Dopa World | Saint Levant" and
// "Dopa World | Ziad Zaza" are different line-ups and stay separate.
function baseName(name: string): string {
  return name.replace(/\s+[-–]\s+[^-–]+$/, "").trim() || name;
}

function seriesKeyFor(performances: TMEvent[]): string {
  const venue = performances[0]._embedded?.venues?.[0];
  return `ticketmaster:series:${venue?.id ?? "no-venue"}:${slugify(baseName(performances[0].name))}`;
}

// Groups performances/options of the same show at the same venue, each group
// sorted by start time.
function groupPerformances(events: TMEvent[]): TMEvent[][] {
  const groups = new Map<string, TMEvent[]>();
  for (const ev of events) {
    const key = seriesKeyFor([ev]);
    const list = groups.get(key) ?? [];
    list.push(ev);
    groups.set(key, list);
  }
  return [...groups.values()].map((list) =>
    list.sort((a, b) => new Date(tmStartsAt(a)).getTime() - new Date(tmStartsAt(b)).getTime())
  );
}

// ---------------------------------------------------------------------------
// Process one show (one or more Ticketmaster performances)
// ---------------------------------------------------------------------------
async function processTMShow(
  performances: TMEvent[],
  supabase: ReturnType<typeof createAdminClient>,
  categorySlugToId: Map<string, number>,
  result: IngestionResult
): Promise<void> {
  const ev = performances[0];
  const last = performances[performances.length - 1];
  const venue = ev._embedded?.venues?.[0];

  // Only Lebanon events
  if (venue?.country?.countryCode && venue.country.countryCode !== "LB") {
    result.skipped++;
    return;
  }

  const governorate = deriveGovernorate(venue);
  let venueId: string | null = null;
  if (venue) venueId = await findOrCreateVenue(supabase, venue);

  const isSeries = performances.length > 1;
  // A multi-date/multi-option show gets a stable key that survives individual
  // performances passing; a one-off keeps its Ticketmaster URL as before.
  const seriesKey = seriesKeyFor(performances);
  const sourceUrl = isSeries ? seriesKey : ev.url;
  // Listings split per seating area/package share a base name; label each
  // option with the part after the dash.
  const hasOptions = new Set(performances.map((p) => p.name)).size > 1;
  const title = hasOptions ? baseName(ev.name) : ev.name;
  const optionLabel = (p: TMEvent) => (hasOptions ? p.name.slice(baseName(p.name).length).replace(/^\s*[-–]\s*/, "") || null : null);
  const baseSlug = `tm-${slugify(title)}`;

  const startsAt = tmStartsAt(ev);
  const endsAt = isSeries ? last.dates.end?.dateTime ?? tmStartsAt(last) : ev.dates.end?.dateTime ?? null;
  const showtimes = isSeries
    ? performances.map((p) => ({ starts_at: tmStartsAt(p), ends_at: p.dates.end?.dateTime ?? null, ticket_url: p.url, label: optionLabel(p) }))
    : [];

  const price = ev.priceRanges?.[0];
  const description = [ev.info, ev.pleaseNote].filter(Boolean).join(" ").slice(0, 2000) || "";

  const payload = {
    slug: baseSlug,
    title_i18n: { en: title },
    description_i18n: { en: description },
    category_id: resolveCategory(ev, categorySlugToId),
    venue_id: venueId,
    starts_at: startsAt,
    ends_at: endsAt,
    timezone: ev.dates.timezone ?? "Asia/Beirut",
    cover_image: pickBestImage(ev.images),
    price_min: price?.min ?? null,
    price_max: price?.max ?? null,
    currency: price?.currency ?? "USD",
    ticket_url: ev.url,
    status: "published" as const,
    source: "ticketmaster",
    source_url: sourceUrl,
    governorate,
    showtimes,
  };

  // Match on the series key and on every performance URL, so rows saved
  // before shows were grouped (one per performance) get merged into one.
  const { data: matches } = await supabase
    .from("events")
    .select("id, slug, status")
    .eq("source", "ticketmaster")
    .in("source_url", [seriesKey, ...performances.map((p) => p.url)])
    .order("created_at");
  const existing = matches?.[0];

  if (existing) {
    // Keep the category of events we already have, so manual corrections in
    // the database aren't overwritten on the next run. New events still get
    // one from resolveCategory().
    const { category_id: _keepExistingCategory, ...updatePayload } = payload;
    void _keepExistingCategory;
    await supabase.from("events").update({ ...updatePayload, slug: existing.slug }).eq("id", existing.id);
    // Hide (not delete) any leftover per-performance duplicates.
    const extraIds = (matches ?? []).slice(1).filter((m) => m.status === "published").map((m) => m.id);
    if (extraIds.length) await supabase.from("events").update({ status: "draft" }).in("id", extraIds);
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
