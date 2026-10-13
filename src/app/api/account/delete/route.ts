/**
 * POST /api/account/delete
 * Returns: { ok: true } or { error }
 *
 * The signed-in person permanently deletes their own account: their events
 * (with uploaded files), then the sign-in account itself, which removes the
 * profile, saved events, reminders, reports, contacts and requests with it.
 * Admin accounts can't be deleted this way (so the site always keeps one).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteEventFully } from "@/lib/duplicateCheck";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role === "admin") return NextResponse.json({ error: "Admin accounts can't be deleted here." }, { status: 403 });

  const { data: events } = await admin.from("events").select("id").or(`user_id.eq.${user.id},created_by.eq.${user.id}`);
  for (const e of events ?? []) {
    const { error } = await deleteEventFully(admin, e.id);
    if (error) return NextResponse.json({ error }, { status: 500 });
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.auth.signOut().catch(() => {});
  return NextResponse.json({ ok: true });
}
