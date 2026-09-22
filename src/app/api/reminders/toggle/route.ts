/**
 * POST /api/reminders/toggle
 * Body: { eventId: string, locale?: string }
 * Returns: { reminded: boolean, remindAt: string | null }
 *
 * Requires the user to be signed in via Supabase session cookie.
 * Sets a reminder REMINDER_OFFSET_DAYS before the event starts (or removes
 * an existing, not-yet-sent reminder if one is already set).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeRemindAt } from "@/lib/reminders";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { eventId, locale } = await req.json();
  if (!eventId) {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("reminders")
    .select("id")
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .is("sent_at", null)
    .maybeSingle();

  if (existing) {
    await supabase.from("reminders").delete().eq("id", existing.id);
    return NextResponse.json({ reminded: false, remindAt: null });
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("starts_at")
    .eq("id", eventId)
    .maybeSingle();
  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const remindAt = computeRemindAt(event.starts_at);
  const { error: insertError } = await supabase
    .from("reminders")
    .insert({ user_id: user.id, event_id: eventId, remind_at: remindAt, locale: locale || "en" });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ reminded: true, remindAt });
}
