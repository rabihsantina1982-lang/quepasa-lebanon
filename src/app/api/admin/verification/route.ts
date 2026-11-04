/**
 * POST /api/admin/verification
 * Body: { userId: string, check: CheckKey, done: boolean }   tick / untick a checklist item
 *    or { docId: string, status: "accepted" | "rejected" }   decide on an uploaded document
 * Admin only. Checklist ticks are stored on the person's latest promoter
 * application, with the admin's name and the time.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCheckKey, type Checks, type CheckKey } from "@/lib/verification";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role, display_name, email").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();

  if (typeof body.docId === "string") {
    if (body.status !== "accepted" && body.status !== "rejected") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const { error } = await admin
      .from("verification_documents")
      .update({ status: body.status, reviewed_at: new Date().toISOString() })
      .eq("id", body.docId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (typeof body.userId !== "string" || !isCheckKey(body.check) || typeof body.done !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { data: app } = await admin
    .from("promoter_applications")
    .select("id, checks")
    .eq("user_id", body.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!app) return NextResponse.json({ error: "No application found for this promoter." }, { status: 404 });

  const key: CheckKey = body.check;
  const checks = { ...((app.checks ?? {}) as Checks) };
  if (body.done) checks[key] = { at: new Date().toISOString(), by: me.display_name || me.email || "admin" };
  else delete checks[key];
  const { error } = await admin.from("promoter_applications").update({ checks }).eq("id", app.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
