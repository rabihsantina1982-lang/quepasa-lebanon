/**
 * POST /api/events/delete
 * Body: { eventId: string }
 * Returns: { ok: true } or { error }
 *
 * Permanently deletes an event. Allowed for the person who posted it and for
 * admins (who can delete any event, including imported ones). Uploaded
 * photos/videos no other event uses are removed from storage too.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteEventFully } from "@/lib/duplicateCheck";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { eventId } = await req.json().catch(() => ({}));
  if (typeof eventId !== "string") return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const admin = createAdminClient();
  const [{ data: profile }, { data: event }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    admin.from("events").select("user_id, created_by").eq("id", eventId).maybeSingle(),
  ]);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const isOwner = event.user_id === user.id || event.created_by === user.id;
  if (!isOwner && profile?.role !== "admin") return NextResponse.json({ error: "You can only delete your own events" }, { status: 403 });

  const { error } = await deleteEventFully(admin, eventId);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
