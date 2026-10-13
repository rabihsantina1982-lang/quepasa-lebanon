// Possible duplicate events: the same event listed twice (e.g. imported by
// us and later posted by the organiser, or imported from two sources).
// Two events match when their dates overlap, they are in the same place
// (same venue, or venue names that share most words; never different
// emirates/governorates) and their titles share most of their meaningful
// words. Organisers type venue names freely, so a re-post rarely has the
// same venue row as our listing. Admins confirm on /admin (delete one, or mark
// "not duplicates" so the pair stops showing).

export interface DupCandidate {
  id: string;
  title_i18n: Record<string, string> | null;
  starts_at: string;
  ends_at: string | null;
  venue_id?: string | null;
  venue_name?: string | null;
  region?: string | null;
}

// Words that say nothing about which event it is.
const STOP = new Set([
  "the", "a", "an", "and", "of", "in", "at", "on", "for", "with", "by", "to", "from", "x", "vs",
  "live", "concert", "show", "tour", "presents", "present", "featuring", "feat", "ft", "night", "edition",
  "event", "events", "official", "tickets", "festival", "season", "special", "world", "experience",
  "dubai", "abu", "dhabi", "sharjah", "ajman", "uae", "emirates", "rak", "fujairah",
  "beirut", "lebanon", "liban",
  "le", "la", "les", "de", "du", "des", "et", "au", "en",
  "2025", "2026", "2027", "2028",
]);

// Combining accents (U+0300-036F) and Arabic harakat (U+064B-065F).
const DIACRITICS = new RegExp(
  `[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}${String.fromCharCode(0x64b)}-${String.fromCharCode(0x65f)}]`,
  "g"
);

export function titleWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(DIACRITICS, "")
      .replace(/['’`]/g, "")
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length > 1 && !STOP.has(w))
  );
}

function titleOf(e: DupCandidate): string {
  return e.title_i18n?.en ?? Object.values(e.title_i18n ?? {})[0] ?? "";
}

// Share of the shorter title's words found in the other title (0-1).
export function titleOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  let common = 0;
  for (const w of small) if (big.has(w)) common++;
  return common / small.size;
}

const DAY = 24 * 3600 * 1000;

// Overlapping date ranges, with a day's slack for time-zone / end-time slips.
function datesOverlap(a: DupCandidate, b: DupCandidate): boolean {
  const aFrom = new Date(a.starts_at).getTime(), aTo = new Date(a.ends_at ?? a.starts_at).getTime();
  const bFrom = new Date(b.starts_at).getTime(), bTo = new Date(b.ends_at ?? b.starts_at).getTime();
  return aFrom <= bTo + DAY && bFrom <= aTo + DAY;
}

function samePlace(a: DupCandidate, b: DupCandidate): boolean {
  if (a.region && b.region && a.region !== b.region) return false;
  if (a.venue_id && a.venue_id === b.venue_id) return true;
  if (!a.venue_name || !b.venue_name) return false;
  return titleOverlap(titleWords(a.venue_name), titleWords(b.venue_name)) >= 0.5;
}

export function isPossibleDuplicate(a: DupCandidate, b: DupCandidate, aw = titleWords(titleOf(a)), bw = titleWords(titleOf(b))): boolean {
  if (a.id === b.id || !datesOverlap(a, b) || !samePlace(a, b)) return false;
  const overlap = titleOverlap(aw, bw);
  // One-word titles ("Hamlet") need an exact match; otherwise most words shared.
  if (Math.min(aw.size, bw.size) === 1) return overlap === 1 && Math.max(aw.size, bw.size) <= 3;
  return overlap >= 0.75;
}

export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

// All possible-duplicate pairs among `events`, minus pairs an admin dismissed.
// With `onlyFor`, just the pairs involving those event ids.
export function findDuplicatePairs<T extends DupCandidate>(events: T[], dismissed: Set<string> = new Set(), onlyFor?: Set<string>): [T, T][] {
  const words = new Map(events.map((e) => [e.id, titleWords(titleOf(e))]));
  const pairs: [T, T][] = [];
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i], b = events[j];
      if (onlyFor && !onlyFor.has(a.id) && !onlyFor.has(b.id)) continue;
      if (dismissed.has(pairKey(a.id, b.id))) continue;
      if (isPossibleDuplicate(a, b, words.get(a.id), words.get(b.id))) pairs.push([a, b]);
    }
  }
  return pairs;
}
