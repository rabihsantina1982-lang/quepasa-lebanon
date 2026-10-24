/**
 * POST /api/admin/promotion
 * Body: { requestId: string, action: "approve" | "reject" }
 *    or { promotionId: string, action: "end" }
 *    or { userId: string, action: "end_pro" }
 * Admin only. Approving a boost/spotlight request switches it on for the dates
 * the promoter booked (older requests without dates start when any current
 * one on that event ends); approving Pro extends the account's pro_until.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { activateRequest } from "@/lib/promotionBooking";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const now = new Date();

  if (body.action === "end" && typeof body.promotionId === "string") {
    const { error } = await supabase
      .from("event_promotions")
      .update({ ends_at: now.toISOString() })
      .eq("id", body.promotionId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "end_pro" && typeof body.userId === "string") {
    const { error } = await supabase.from("profiles").update({ pro_until: now.toISOString() }).eq("id", body.userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  const { requestId, action } = body;
  if (typeof requestId !== "string" || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: request } = await supabase
    .from("promotion_requests")
    .select("id, user_id, event_id, kind, duration, status, starts_at, ends_at")
    .eq("id", requestId)
    .single();
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.status !== "pending") return NextResponse.json({ error: "Already handled" }, { status: 409 });

  if (action === "approve") {
    const problem = await activateRequest(createAdminClient(), request);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }

  await supabase
    .from("promotion_requests")
    .update({ status: action === "approve" ? "approved" : "rejected", reviewed_at: now.toISOString() })
    .eq("id", requestId);

  return NextResponse.json({ success: true });
}
