// Directory ("Connect") profile types. Labels live in messages under
// Connect.types.<slug>; colours are the tag chip styles.
// Order = order of the filter chips on /connect.
export const PROFILE_TYPES = [
  "artist", "dj", "coach", "expert", "athlete", "chef", "organizer", "promoter", "venue", "business", "community",
] as const;
export type ProfileType = (typeof PROFILE_TYPES)[number];

export const PROFILE_TYPE_STYLE: Record<ProfileType, string> = {
  artist: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
  dj: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  organizer: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  venue: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  business: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  promoter: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  coach: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  expert: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  athlete: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  chef: "bg-lime-500/15 text-lime-400 border-lime-500/30",
  community: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
};

// English labels for the promoter/admin area (English-only by convention).
export const PROFILE_TYPE_EN: Record<ProfileType, string> = {
  artist: "Artist / Performer",
  dj: "DJ",
  organizer: "Event Organizer",
  venue: "Venue",
  business: "Business / Brand",
  promoter: "Promoter / Agency",
  coach: "Coach / Instructor (yoga, fitness, life coaching, classes)",
  expert: "Expert / Speaker (talks, workshops, consulting)",
  athlete: "Athlete / Sports team",
  chef: "Chef / Food (supper clubs, tastings)",
  community: "Community / Club (running clubs, charities, groups)",
};

export function isProfileType(v: unknown): v is ProfileType {
  return typeof v === "string" && (PROFILE_TYPES as readonly string[]).includes(v);
}

// Older application forms used different type values.
const LEGACY_TYPE: Record<string, ProfileType> = { agency: "promoter", brand: "business", other: "organizer" };
export function toProfileType(v: string | null | undefined): ProfileType | null {
  if (!v) return null;
  return isProfileType(v) ? v : LEGACY_TYPE[v] ?? null;
}
