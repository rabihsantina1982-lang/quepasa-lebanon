/**
 * POST /api/promoter/promotion
 * Body: { kind: "boost" | "spotlight" | "pro", eventId?: string, duration: number, useFreeBoost?: boolean, note?: string }
 * A promoter requests a boost / homepage spotlight for one of their events,
 * or Pro for their account. An admin approves it from /admin once paid.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPro } from "@/lib/promotions";
import { PRICING } from "@/lib/pricing";

const KINDS = ["boost", "spotlight", "pro"] as const;
type Kind = (typeof KINDS)[number];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role, pro_until").eq("id", user.id).single();
  if (profile?.role !== "promoter" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Promoters only" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const kind = body.kind as Kind;
  const duration = Number(body.duration);
  const eventId = typeof body.eventId === "string" ? body.eventId : null;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) || null : null;
  if (!KINDS.includes(kind) || !Number.isInteger(duration) || duration < 1 || duration > 12) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if ((kind === "pro") !== (eventId === null)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // One open request per event and kind (or one open Pro request).
  let pending = supabase
    .from("promotion_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("kind", kind)
    .eq("status", "pending");
  pending = eventId ? pending.eq("event_id", eventId) : pending.is("event_id", null);
  const { count: openCount } = await pending;
  if ((openCount ?? 0) > 0) {
    return NextResponse.json({ error: "You already have a request waiting for this. We'll be in touch soon." }, { status: 409 });
  }

  // Pro includes a set number of free boost weeks per calendar month.
  let useFreeBoost = false;
  if (body.useFreeBoost) {
    if (kind !== "boost" || duration !== 1 || !isPro(profile)) {
      return NextResponse.json({ error: "Free boosts are for one week, with Pro." }, { status: 400 });
    }
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const { count: used } = await supabase
      .from("promotion_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("use_free_boost", true)
      .neq("status", "rejected")
      .gte("created_at", monthStart.toISOString());
    if ((used ?? 0) >= PRICING.proFreeBoostsPerMonth) {
      return NextResponse.json({ error: "You've used this month's free boost." }, { status: 400 });
    }
    useFreeBoost = true;
  }

  // RLS also checks that the event belongs to this promoter.
  const { error } = await supabase.from("promotion_requests").insert({
    user_id: user.id,
    event_id: eventId,
    kind,
    duration,
    use_free_boost: useFreeBoost,
    note,
  });
  if (error) return NextResponse.json({ error: "Couldn't send the request. Please try again." }, { status: 400 });

  return NextResponse.json({ success: true });
}
