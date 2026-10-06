/**
 * POST /api/share/track
 * Body: { eventId: string, channel: "whatsapp"|"copy_link", locale?: string }
 *
 * Fire-and-forget logging of a share action, for per-event/per-channel share
 * counts. No auth required — sharing works for anonymous visitors too — but
 * the signed-in user is attached when there is one. Repeats from the same
 * visitor aren't counted (src/lib/visitor.ts).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { visitorId, countableEvent, isRepeat, REPEAT_WINDOW_MINUTES } from "@/lib/visitor";
import type { ShareChannel } from "@/lib/supabase/types";

const VALID_CHANNELS: ShareChannel[] = ["whatsapp", "copy_link"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { eventId, channel, locale } = body;

  if (typeof eventId !== "string" || !VALID_CHANNELS.includes(channel)) {
    return NextResponse.json({ error: "Invalid eventId/channel" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;
  const visitor = visitorId(req, userId);
  const admin = createAdminClient();

  if (
    !(await countableEvent(admin, eventId, userId)) ||
    (await isRepeat(admin, "share_events", visitor, { event_id: eventId, channel }, REPEAT_WINDOW_MINUTES.share))
  ) {
    return NextResponse.json({ ok: true, counted: false });
  }

  const { error } = await admin.from("share_events").insert({
    event_id: eventId,
    user_id: userId,
    channel,
    locale: typeof locale === "string" ? locale.slice(0, 5) : "en",
    visitor,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, counted: true });
}
