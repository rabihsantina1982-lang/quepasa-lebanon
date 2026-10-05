/**
 * POST /api/admin/promotion
 * Body: { requestId: string, action: "approve" | "reject" }
 *    or { promotionId: string, action: "end" }
 *    or { userId: string, action: "end_pro" }
 * Admin only. Approving a boost/spotlight request schedules it to start when
 * any current one of the same kind ends (or now); approving Pro extends the
 * account's pro_until the same way.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    .select("id, user_id, event_id, kind, duration, status")
    .eq("id", requestId)
    .single();
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.status !== "pending") return NextResponse.json({ error: "Already handled" }, { status: 409 });

  if (action === "approve") {
    if (request.kind === "pro") {
      const { data: owner } = await supabase.from("profiles").select("pro_until").eq("id", request.user_id).single();
      const current = owner?.pro_until ? new Date(owner.pro_until) : null;
      const until = current && current > now ? new Date(current) : new Date(now);
      until.setMonth(until.getMonth() + request.duration);
      const { error } = await supabase.from("profiles").update({ pro_until: until.toISOString() }).eq("id", request.user_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      // Queue after any existing promotion of the same kind on this event.
      const { data: latest } = await supabase
        .from("event_promotions")
        .select("ends_at")
        .eq("event_id", request.event_id)
        .eq("kind", request.kind)
        .gt("ends_at", now.toISOString())
        .order("ends_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const start = latest ? new Date(latest.ends_at) : now;
      const end = new Date(start.getTime() + request.duration * 7 * 86400000);
      const { error } = await supabase.from("event_promotions").insert({
        event_id: request.event_id,
        kind: request.kind,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  await supabase
    .from("promotion_requests")
    .update({ status: action === "approve" ? "approved" : "rejected", reviewed_at: now.toISOString() })
    .eq("id", requestId);

  return NextResponse.json({ success: true });
}
