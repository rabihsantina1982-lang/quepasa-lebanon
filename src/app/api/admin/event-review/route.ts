/**
 * POST /api/admin/event-review
 * Body: { eventId: string, action: "approve" | "reject" }
 * Admin only. Approving publishes a submitted event; rejecting it also
 * refunds any boost / spotlight paid for it by card and frees its dates.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { releaseEventOrders } from "@/lib/payments";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { eventId, action } = await req.json().catch(() => ({}));
  if (typeof eventId !== "string" || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { error } = await supabase
    .from("events")
    .update({ status: action === "approve" ? "published" : "rejected", updated_at: new Date().toISOString() })
    .eq("id", eventId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (action === "reject") {
    const result = await releaseEventOrders(createAdminClient(), eventId);
    return NextResponse.json({ ok: true, ...result });
  }
  return NextResponse.json({ ok: true });
}
