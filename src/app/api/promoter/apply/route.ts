import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const { business_name, business_type, phone, instagram, website, description } = body;

  if (!business_name || !business_type || !description) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check if already applied
  const { data: existing } = await supabase
    .from("promoter_applications")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: `You already have a ${existing.status} application.` },
      { status: 409 }
    );
  }

  // Save application
  const { error } = await supabase.from("promoter_applications").insert({
    user_id: user.id,
    business_name,
    business_type,
    website: website || null,
    instagram: instagram || null,
    description,
    status: "pending",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Save basic profile info
  await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    display_name: body.full_name || null,
  }, { onConflict: "id" });

  return NextResponse.json({ success: true });
}
