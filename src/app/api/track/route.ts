/**
 * POST /api/track
 * Body: { eventId: string, kind: "view"|"ticket_click", locale?: string }
 *
 * Fire-and-forget logging of an event page view or a "Get tickets" /
 * "Call to book" click, for promoter stats. Sent with navigator.sendBeacon,
 * so it must not require auth; the signed-in user is attached when present.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_KINDS = ["view", "ticket_click"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { eventId, kind, locale } = body;

  if (typeof eventId !== "string" || !VALID_KINDS.includes(kind)) {
    return NextResponse.json({ error: "Invalid eventId/kind" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("event_activity").insert({
    event_id: eventId,
    user_id: user?.id ?? null,
    kind,
    locale: typeof locale === "string" ? locale.slice(0, 5) : "en",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
