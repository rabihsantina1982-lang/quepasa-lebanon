// Saving an edited event (used by /api/events/update; see the rules there).
import type { SupabaseClient } from "@supabase/supabase-js";
import { removeUnusedFiles, emailAdmins } from "./duplicateCheck";
import { scamSignals } from "./scamSignals";
import { checkTicketLink } from "./ticketLinks";

// Where the region lives on events/venues in this app.
const REGION_COLUMN = "governorate";
const DEFAULT_CITY = "Beirut";

type Showtime = { starts_at: string; ends_at: string | null; ticket_url: string | null; label?: string };
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown) => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v));
const iso = (v: unknown) => {
  const d = new Date(str(v));
  return isNaN(d.getTime()) ? null : d.toISOString();
};

export type UpdateResult = { ok: true; status: string; slug: string } | { error: string; code: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateEvent(admin: SupabaseClient, userId: string, body: any): Promise<UpdateResult> {
  const [{ data: profile }, { data: ev }] = await Promise.all([
    admin.from("profiles").select("role, suspended_at").eq("id", userId).maybeSingle(),
    admin
      .from("events")
      .select(`id, slug, status, user_id, created_by, title_i18n, description_i18n, ticket_url, booking_phone, showtimes, cover_image, venue_id, region:${REGION_COLUMN}, venue:venues(name, area), media:event_media(url)`)
      .eq("id", body.eventId)
      .maybeSingle(),
  ]);
  if (!ev) return { error: "Event not found", code: 404 };
  const isAdmin = profile?.role === "admin";
  const isOwner = ev.user_id === userId || ev.created_by === userId;
  if (!isAdmin && !isOwner) return { error: "You can only edit your own events", code: 403 };
  if (!isAdmin && profile?.suspended_at) return { error: "Your account is suspended", code: 403 };

  const title = str(body.title), description = str(body.description), venueName = str(body.venue_name);
  if (!title || !description || !venueName) return { error: "Title, description and venue are required", code: 400 };

  // Dates: one start (+ optional end), or several dates saved as showtimes.
  const dates = Array.isArray(body.dates) ? [...new Set(body.dates.map(iso).filter((d: string | null): d is string => !!d))].sort() as string[] : [];
  const ticketUrl = str(body.ticket_url) || null;
  let startsAt: string | null, endsAt: string | null, showtimes: Showtime[] = [];
  if (dates.length >= 2) {
    // Keep each date's own label / ticket link (e.g. per-show line-ups) when it's unchanged.
    const old = new Map(((ev.showtimes ?? []) as Showtime[]).map((s) => [new Date(s.starts_at).toISOString(), s]));
    showtimes = dates.map((d) => {
      const prev = old.get(d);
      return { starts_at: d, ends_at: null, ticket_url: prev?.ticket_url ?? ticketUrl, ...(prev?.label ? { label: prev.label } : {}) };
    });
    startsAt = dates[0];
    endsAt = dates[dates.length - 1];
  } else {
    startsAt = iso(body.starts_at);
    endsAt = iso(body.ends_at);
  }
  if (!startsAt) return { error: "Please pick the event date", code: 400 };
  if (endsAt && endsAt < startsAt) endsAt = null;

  // Venue: keep the same venue row unless its name/area/region changed.
  const region = str(body.region) || null;
  const oldVenue = ev.venue as unknown as { name: string; area: string | null } | null;
  let venueId = ev.venue_id as string | null;
  if (!oldVenue || oldVenue.name !== venueName || (oldVenue.area ?? "") !== str(body.venue_area) || (ev.region ?? null) !== region) {
    const { data: v, error: vErr } = await admin
      .from("venues")
      .insert({ name: venueName, area: str(body.venue_area) || null, city: region || DEFAULT_CITY }) // same as the submit form
      .select("id")
      .single();
    if (vErr) return { error: vErr.message, code: 400 };
    venueId = v.id;
  }

  // Keep other-language titles/descriptions only if the English text is unchanged.
  const oldTitle = (ev.title_i18n ?? {}) as Record<string, string>;
  const oldDesc = (ev.description_i18n ?? {}) as Record<string, string>;
  const title_i18n = oldTitle.en === title ? oldTitle : { en: title };
  const description_i18n = oldDesc.en === description ? oldDesc : { en: description };

  const media = (Array.isArray(body.media) ? body.media : [])
    .filter((m: { url?: unknown; kind?: unknown }) => typeof m?.url === "string" && (m.kind === "image" || m.kind === "video"))
    .slice(0, 3) as { url: string; kind: "image" | "video" }[];
  const bookingPhone = str(body.booking_phone) || null;
  const tags = Array.isArray(body.tags) ? body.tags.filter((t: unknown): t is string => typeof t === "string").slice(0, 12) : [];

  // Organiser edits: back to review when the way people pay changes, or on scam signs.
  let status = ev.status as string;
  let reviewReason: string | null = null;
  if (!isAdmin) {
    const oldLinks = new Set([ev.ticket_url, ...((ev.showtimes ?? []) as Showtime[]).map((s) => s.ticket_url)].filter(Boolean));
    const newLinks = [ticketUrl, ...showtimes.map((s) => s.ticket_url)].filter((u): u is string => !!u);
    const linkChanged = newLinks.some((u) => !oldLinks.has(u)) || (bookingPhone ?? "") !== (ev.booking_phone ?? "");
    const risky = newLinks.some((u) => checkTicketLink(u).level !== "ok") || scamSignals(`${title} ${description}`, newLinks.length > 0).length > 0;
    if (status === "rejected") {
      status = "pending";
      reviewReason = "was rejected and has been edited";
    } else if (status === "published" && (linkChanged || risky)) {
      status = "pending";
      reviewReason = linkChanged ? "changed its ticket link or booking phone" : "has warning signs in the text or links";
    }
  }

  const { error } = await admin
    .from("events")
    .update({
      title_i18n, description_i18n,
      category_id: num(body.category_id),
      [REGION_COLUMN]: region,
      venue_id: venueId,
      starts_at: startsAt, ends_at: endsAt, showtimes,
      ticket_url: ticketUrl, booking_phone: bookingPhone,
      price_min: num(body.price_min), price_max: num(body.price_max),
      tags,
      cover_image: media.find((m) => m.kind === "image")?.url ?? null,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ev.id);
  if (error) return { error: error.message, code: 400 };

  // Replace the photos/video, then drop uploaded files nothing uses any more.
  const oldUrls = [...((ev.media ?? []) as { url: string }[]).map((m) => m.url), ev.cover_image].filter((u): u is string => !!u);
  await admin.from("event_media").delete().eq("event_id", ev.id);
  if (media.length) {
    await admin.from("event_media").insert(media.map((m, i) => ({ event_id: ev.id, url: m.url, kind: m.kind, position: i, provider: "upload" })));
  }
  await removeUnusedFiles(admin, oldUrls.filter((u) => !media.some((m) => m.url === u)));

  if (reviewReason) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const safe = title.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    await emailAdmins(
      admin,
      `Edited event needs review: ${title}`,
      `<p><strong>${safe}</strong> ${reviewReason}, so it's waiting for review${ev.status === "published" ? " and is off the site until you approve it" : ""}.</p>
       <p><a href="${siteUrl}/en/admin">Open Admin</a> (Event Submissions).</p>`
    ).catch(() => {});
  }

  return { ok: true, status, slug: ev.slug as string };
}
