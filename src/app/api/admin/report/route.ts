/**
 * POST /api/admin/report
 * Body: { eventId: string, action: "hide" | "dismiss" | "restore" }
 * Admin only. "hide" takes the event off the site (back to draft) and closes
 * its open reports as resolved; "dismiss" closes them with no change;
 * "restore" puts an automatically hidden event back live and dismisses them.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { eventId, action } = await req.json().catch(() => ({}));
  if (typeof eventId !== "string" || !["hide", "dismiss", "restore"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (action === "hide" || action === "restore") {
    const { error } = await supabase.from("events").update({ status: action === "hide" ? "draft" : "published" }).eq("id", eventId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error } = await supabase
    .from("event_reports")
    .update({ status: action === "hide" ? "resolved" : "dismissed", resolved_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("status", "open");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
