/**
 * POST /api/favorites/toggle
 * Body: { eventId: string }
 * Returns: { saved: boolean }
 *
 * Requires the user to be signed in via Supabase session cookie.
 * If not signed in, returns 401.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { eventId } = await req.json();
  if (!eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  // Check if already saved
  const { data: existing } = await supabase
    .from("favorites")
    .select("event_id")
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing) {
    // Already saved — remove it
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("event_id", eventId);
    return NextResponse.json({ saved: false });
  } else {
    // Not saved — add it
    await supabase
      .from("favorites")
      .insert({ user_id: user.id, event_id: eventId });
    return NextResponse.json({ saved: true });
  }
}
