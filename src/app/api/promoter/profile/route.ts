import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isProfileType } from "@/lib/profileTypes";

const CONTACT_KEYS = ["phone", "whatsapp", "email", "instagram", "website"] as const;

/**
 * PATCH /api/promoter/profile
 * Body: { business_name?, logo_url?, profile_type?, bio?, contacts? }
 * Self-service — a promoter updates their own public business profile (shown
 * under their events and in the Connect directory) and their contact details
 * (profile_contacts, readable by signed-in users only). RLS limits both
 * writes to the caller's own rows.
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { business_name, logo_url, profile_type, bio, contacts } = body;

  const update: Record<string, string | null> = {};
  if (typeof business_name === "string" && business_name.trim()) update.business_name = business_name.trim().slice(0, 120);
  if (typeof logo_url === "string" && logo_url.trim()) update.logo_url = logo_url.trim();
  if (profile_type === null || profile_type === "") update.profile_type = null;
  else if (profile_type !== undefined) {
    if (!isProfileType(profile_type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    update.profile_type = profile_type;
  }
  if (typeof bio === "string") update.bio = bio.trim().slice(0, 500) || null;

  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (contacts && typeof contacts === "object") {
    const row: Record<string, string | null> = { user_id: user.id, updated_at: new Date().toISOString() };
    for (const k of CONTACT_KEYS) {
      const v = contacts[k];
      row[k] = typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : null;
    }
    const { error } = await supabase.from("profile_contacts").upsert(row, { onConflict: "user_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
