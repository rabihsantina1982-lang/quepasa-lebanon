// Server-only helpers around src/lib/duplicates.ts: load upcoming events,
// find possible duplicates, email admins, and delete an event cleanly.
import type { SupabaseClient } from "@supabase/supabase-js";
import { findDuplicatePairs, pairKey, type DupCandidate } from "./duplicates";

// Where the region lives on events in this app.
const REGION_COLUMN = "governorate";

export interface DupEvent extends DupCandidate {
  slug: string;
  status: string;
  source: string | null;
  created_at: string;
  user_id: string | null;
  cover_image: string | null;
  venue_name: string | null;
  region: string | null;
  posted_by: string | null;
}

type Row = Omit<DupEvent, "venue_name" | "region" | "posted_by"> & {
  region: string | null;
  venue: { name: string } | null;
  promoter: { business_name: string | null; display_name: string | null } | null;
};

// Published + pending events that haven't ended yet.
export async function loadUpcomingForDuplicates(admin: SupabaseClient): Promise<DupEvent[]> {
  const now = new Date().toISOString();
  const { data } = await admin
    .from("events")
    .select(`id, slug, title_i18n, starts_at, ends_at, venue_id, status, source, created_at, user_id, cover_image, region:${REGION_COLUMN}, venue:venues(name), promoter:profiles!events_user_id_fkey(business_name, display_name)`)
    .in("status", ["published", "pending"])
    .or(`ends_at.gte.${now},and(ends_at.is.null,starts_at.gte.${now})`)
    .order("starts_at", { ascending: true })
    .limit(2000);
  return ((data ?? []) as unknown as Row[]).map(({ venue, promoter, region, ...e }) => ({
    ...e,
    region: region ? region.toLowerCase() : null,
    venue_name: venue?.name ?? null,
    posted_by: promoter?.business_name ?? promoter?.display_name ?? null,
  }));
}

export async function loadDismissed(admin: SupabaseClient): Promise<Set<string>> {
  const { data } = await admin.from("duplicate_dismissals").select("event_a, event_b");
  return new Set(((data ?? []) as { event_a: string; event_b: string }[]).map((d) => pairKey(d.event_a, d.event_b)));
}

export async function findDuplicates(admin: SupabaseClient, onlyFor?: string[]): Promise<[DupEvent, DupEvent][]> {
  const [events, dismissed] = await Promise.all([loadUpcomingForDuplicates(admin), loadDismissed(admin)]);
  return findDuplicatePairs(events, dismissed, onlyFor ? new Set(onlyFor) : undefined);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const titleOf = (e: DupEvent) => e.title_i18n?.en ?? Object.values(e.title_i18n ?? {})[0] ?? e.slug;

// Email every admin (Resend). Quietly does nothing if email isn't set up.
export async function emailAdmins(admin: SupabaseClient, subject: string, html: string) {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.REMINDERS_FROM_EMAIL;
  if (!resendKey || !fromEmail) return;
  const { data: admins } = await admin.from("profiles").select("email").eq("role", "admin");
  const to = (admins ?? []).map((a) => a.email).filter((e): e is string => !!e);
  if (to.length === 0) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromEmail, to, subject, html }),
  });
}

export async function emailDuplicateAlert(admin: SupabaseClient, newEvent: DupEvent, matches: DupEvent[]) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Beirut" });
  const line = (e: DupEvent) =>
    `<li><strong>${esc(titleOf(e))}</strong> · ${day(e.starts_at)}${e.venue_name ? ` · ${esc(e.venue_name)}` : ""} · ${e.status}${e.posted_by ? ` · posted by ${esc(e.posted_by)}` : ` · ${esc(e.source ?? "imported")}`}</li>`;
  await emailAdmins(
    admin,
    `Possible duplicate: ${titleOf(newEvent)}`,
    `<p>A new event submission looks like an event that's already on the site.</p>
     <p>New:</p><ul>${line(newEvent)}</ul>
     <p>Already listed:</p><ul>${matches.map(line).join("")}</ul>
     <p><a href="${siteUrl}/en/admin#duplicates">Open Admin</a> to delete one of them, or mark them as not duplicates.</p>`
  );
}

// Delete an event and its uploaded photos/videos (files no other event uses).
// Favourites, reminders, stats, reports and promotions go with it (cascade).
export async function deleteEventFully(admin: SupabaseClient, eventId: string): Promise<{ error?: string }> {
  const { data: media } = await admin.from("event_media").select("url").eq("event_id", eventId);
  const { data: ev } = await admin.from("events").select("cover_image").eq("id", eventId).maybeSingle();
  const urls = [...new Set([...(media ?? []).map((m) => m.url as string), ev?.cover_image as string | null].filter((u): u is string => !!u && u.includes("/event-media/")))];

  const { error } = await admin.from("events").delete().eq("id", eventId);
  if (error) return { error: error.message };

  // "Duplicate" on the dashboard reuses the same files, so keep any still in use.
  const unused: string[] = [];
  for (const url of urls) {
    const [{ count: m }, { count: c }] = await Promise.all([
      admin.from("event_media").select("id", { count: "exact", head: true }).eq("url", url),
      admin.from("events").select("id", { count: "exact", head: true }).eq("cover_image", url),
    ]);
    if (!m && !c) unused.push(url.split("/event-media/")[1]);
  }
  if (unused.length) await admin.storage.from("event-media").remove(unused).catch(() => {});
  return {};
}
