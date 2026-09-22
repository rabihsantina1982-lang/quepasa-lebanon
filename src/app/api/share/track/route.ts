/**
 * POST /api/share/track
 * Body: { eventId: string, channel: "whatsapp"|"copy_link", locale?: string }
 *
 * Fire-and-forget logging of a share action, for per-event/per-channel share
 * counts. No auth required — sharing works for anonymous visitors too — but
 * the signed-in user is attached when there is one.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ShareChannel } from "@/lib/supabase/types";

const VALID_CHANNELS: ShareChannel[] = ["whatsapp", "copy_link"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { eventId, channel, locale } = body;

  if (!eventId || !VALID_CHANNELS.includes(channel)) {
    return NextResponse.json({ error: "Invalid eventId/channel" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("share_events").insert({
    event_id: eventId,
    user_id: user?.id ?? null,
    channel,
    locale: locale || "en",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
