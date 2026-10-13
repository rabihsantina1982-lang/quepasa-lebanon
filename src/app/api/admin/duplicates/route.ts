/**
 * POST /api/admin/duplicates
 * Body: { a: string, b: string }  (two event ids)
 * Admin only. Marks the pair "Not duplicates" so it stops showing on /admin.
 * Deleting one of the pair goes through /api/events/delete.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { a, b } = await req.json().catch(() => ({}));
  if (typeof a !== "string" || typeof b !== "string" || a === b) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const [event_a, event_b] = a < b ? [a, b] : [b, a];
  const { error } = await supabase.from("duplicate_dismissals").upsert({ event_a, event_b, dismissed_by: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
