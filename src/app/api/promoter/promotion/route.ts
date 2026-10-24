/**
 * POST /api/promoter/promotion
 * Body: { kind: "boost" | "spotlight" | "pro", eventId?: string, duration: number, startDate?: "YYYY-MM-DD", useFreeBoost?: boolean, note?: string }
 * A promoter requests a boost / homepage spotlight for one of their events
 * (for the dates picked on the calendar), or Pro for their account, and pays
 * outside the app. An admin approves it from /admin once paid. Paying by card
 * goes through /api/promoter/checkout instead.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prepareOrder } from "@/lib/payments";
import { PRICING } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) || null : null;
  const result = await prepareOrder(createAdminClient(), user.id, body);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const { order } = result;

  // One open request per event and kind (or one open Pro request).
  let pending = supabase
    .from("promotion_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("kind", order.kind)
    .eq("status", "pending");
  pending = order.eventId ? pending.eq("event_id", order.eventId) : pending.is("event_id", null);
  const { count: openCount } = await pending;
  if ((openCount ?? 0) > 0) {
    return NextResponse.json({ error: "You already have a request waiting for this. We'll be in touch soon." }, { status: 409 });
  }

  // Pro includes a set number of free boost weeks per calendar month.
  let useFreeBoost = false;
  if (body.useFreeBoost) {
    if (order.kind !== "boost" || order.duration !== 1 || !order.pro) {
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
      .not("status", "in", "(rejected,cancelled)")
      .gte("created_at", monthStart.toISOString());
    if ((used ?? 0) >= PRICING.proFreeBoostsPerMonth) {
      return NextResponse.json({ error: "You've used this month's free boost." }, { status: 400 });
    }
    useFreeBoost = true;
  }

  // RLS also checks that the event belongs to this promoter.
  const { error } = await supabase.from("promotion_requests").insert({
    user_id: user.id,
    event_id: order.eventId,
    kind: order.kind,
    duration: order.duration,
    use_free_boost: useFreeBoost,
    note,
    starts_at: order.start?.toISOString() ?? null,
    ends_at: order.end?.toISOString() ?? null,
    amount: useFreeBoost ? 0 : order.amount,
    currency: PRICING.currencyCode,
    payment_method: useFreeBoost ? "free" : "manual",
  });
  if (error) return NextResponse.json({ error: "Couldn't send the request. Please try again." }, { status: 400 });

  return NextResponse.json({ success: true });
}
