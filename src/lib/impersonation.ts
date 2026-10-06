// Flags promoter applications whose name or Instagram looks like someone
// already on the app (an approved promoter, a venue, another applicant), so
// the admin double-checks before approving a possible impersonator.

// Combining accents (U+0300-036F) and Arabic harakat (U+064B-065F).
const DIACRITICS = new RegExp(
  `[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}${String.fromCharCode(0x64b)}-${String.fromCharCode(0x65f)}]`,
  "g"
);

// "Casino du Liban!" -> "casinoduliban"; keeps letters and digits in any script.
export function normalizeName(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(DIACRITICS, "").replace(/[^\p{L}\p{N}]/gu, "");
}

export function normalizeHandle(s: string | null | undefined): string {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
}

function similar(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  // One name contains the other ("casinoduliban" in "casinodulibanofficial"),
  // or starts with a short one ("ahm" -> "ahmbeirut").
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  return (short.length >= 4 && long.includes(short)) || (short.length >= 3 && long.startsWith(short));
}

export interface NameSource {
  label: string; // e.g. "approved promoter", "venue"
  name: string;
  instagram?: string | null;
}

export function impersonationWarnings(
  app: { business_name: string; instagram: string | null },
  sources: NameSource[]
): string[] {
  const name = normalizeName(app.business_name);
  const handle = normalizeHandle(app.instagram);
  const warnings = new Set<string>();
  for (const s of sources) {
    if (similar(name, normalizeName(s.name))) {
      warnings.add(`Name looks like ${s.label} "${s.name}"`);
    }
    if (handle && handle === normalizeHandle(s.instagram)) {
      warnings.add(`Same Instagram as ${s.label} "${s.name}"`);
    }
  }
  return [...warnings];
}
