/**
 * POST /api/events/update
 * Body: { eventId, title, description, category_id, region, venue_name, venue_area,
 *         starts_at, ends_at, dates?: string[] (ISO, "several dates"), ticket_url,
 *         booking_phone, price_min, price_max, tags, media: { url, kind }[] }
 * Returns: { ok: true, status, slug } or { error }
 *
 * Saves changes to an event. Allowed for the person who posted it and for
 * admins. An organiser's change to a LIVE event stays live, unless it changes
 * the ticket link / booking phone or the text shows scam warning signs: then
 * it goes back to "pending" for an admin to check, and admins get an email.
 * A rejected event that is edited is sent for review again. Admin edits never
 * change the status.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateEvent } from "@/lib/eventUpdate";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.eventId !== "string") return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const result = await updateEvent(createAdminClient(), user.id, body);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.code });
  return NextResponse.json(result);
}
