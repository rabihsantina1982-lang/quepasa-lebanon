/**
 * POST /api/events/check-duplicates
 * Body: { eventId: string }
 * Returns: { duplicates: number }
 *
 * Called by the submit form right after a new event is saved. If it looks
 * like an event already on the site, every admin gets an email; the pair
 * also shows under "Possible duplicates" on /admin either way.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findDuplicates, emailDuplicateAlert } from "@/lib/duplicateCheck";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { eventId } = await req.json().catch(() => ({}));
  if (typeof eventId !== "string") return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // Only the submitter, and only once while it waits for review.
  const admin = createAdminClient();
  const { data: event } = await admin.from("events").select("user_id, status, created_at").eq("id", eventId).maybeSingle();
  if (!event || event.user_id !== user.id || event.status !== "pending") return NextResponse.json({ duplicates: 0 });
  if (Date.now() - new Date(event.created_at).getTime() > 10 * 60 * 1000) return NextResponse.json({ duplicates: 0 });

  const pairs = await findDuplicates(admin, [eventId]);
  if (pairs.length === 0) return NextResponse.json({ duplicates: 0 });

  const self = pairs[0][0].id === eventId ? pairs[0][0] : pairs[0][1];
  const matches = pairs.map(([a, b]) => (a.id === eventId ? b : a));
  await emailDuplicateAlert(admin, self, matches).catch(() => {});
  return NextResponse.json({ duplicates: matches.length });
}
