/**
 * GET /api/promoter/availability?kind=boost|spotlight[&eventId=...]
 * Places taken per day for the booking calendar, for the next few months.
 * Promoters/admins only. Shows counts only, never whose events they are.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadAvailability, type BookableKind } from "@/lib/promotionBooking";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "promoter" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Promoters only" }, { status: 403 });
  }

  const kind = req.nextUrl.searchParams.get("kind") as BookableKind;
  if (kind !== "boost" && kind !== "spotlight") return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // "Already booked for this event" only for the promoter's own events.
  let eventId = req.nextUrl.searchParams.get("eventId");
  if (eventId) {
    const { data: own } = await admin.from("events").select("id").eq("id", eventId).eq("user_id", user.id).maybeSingle();
    if (!own) eventId = null;
  }

  return NextResponse.json(await loadAvailability(admin, kind, eventId));
}
