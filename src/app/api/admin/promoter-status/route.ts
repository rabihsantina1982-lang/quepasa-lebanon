/**
 * POST /api/admin/promoter-status
 * Body: { userId: string, action: "verify" | "unverify" | "suspend" | "unsuspend" }
 * Admin only. Verified = identity checked (✓ badge). Suspended = all their
 * events and their profile are hidden and they can't post (enforced in the
 * database, migration 0019).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UPDATES = {
  verify: () => ({ verified_at: new Date().toISOString() }),
  unverify: () => ({ verified_at: null }),
  suspend: () => ({ suspended_at: new Date().toISOString() }),
  unsuspend: () => ({ suspended_at: null }),
} as const;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { userId, action } = await req.json().catch(() => ({}));
  if (typeof userId !== "string" || !(action in UPDATES)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (userId === user.id && action === "suspend") {
    return NextResponse.json({ error: "You can't suspend yourself." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(UPDATES[action as keyof typeof UPDATES]())
    .eq("id", userId)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data?.length) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
