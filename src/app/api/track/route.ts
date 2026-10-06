/**
 * POST /api/track
 * Body: { eventId: string, kind: "view"|"ticket_click", locale?: string }
 *
 * Fire-and-forget logging of an event page view or a "Get tickets" /
 * "Call to book" click, for promoter stats. Sent with navigator.sendBeacon,
 * so it must not require auth; the signed-in user is attached when present.
 * Repeats from the same visitor, the event's own promoter and unknown or
 * unpublished events aren't counted (src/lib/visitor.ts).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { visitorId, countableEvent, isRepeat, REPEAT_WINDOW_MINUTES } from "@/lib/visitor";

const VALID_KINDS = ["view", "ticket_click"] as const;
type Kind = (typeof VALID_KINDS)[number];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { eventId, kind, locale } = body;

  if (typeof eventId !== "string" || !VALID_KINDS.includes(kind)) {
    return NextResponse.json({ error: "Invalid eventId/kind" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;
  const visitor = visitorId(req, userId);
  const admin = createAdminClient();

  if (
    !(await countableEvent(admin, eventId, userId)) ||
    (await isRepeat(admin, "event_activity", visitor, { event_id: eventId, kind }, REPEAT_WINDOW_MINUTES[kind as Kind]))
  ) {
    return NextResponse.json({ ok: true, counted: false });
  }

  const { error } = await admin.from("event_activity").insert({
    event_id: eventId,
    user_id: userId,
    kind,
    locale: typeof locale === "string" ? locale.slice(0, 5) : "en",
    visitor,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, counted: true });
}
