import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PATCH /api/promoter/profile
 * Body: { business_name?: string, logo_url?: string }
 * Self-service — a promoter updates their own public business name/logo,
 * shown under every event they post. profiles_self_update already allows
 * this (auth.uid() = id), so no admin check is needed here.
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { business_name, logo_url } = await req.json();
  const update: Record<string, string> = {};
  if (typeof business_name === "string" && business_name.trim()) update.business_name = business_name.trim();
  if (typeof logo_url === "string" && logo_url.trim()) update.logo_url = logo_url.trim();

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
