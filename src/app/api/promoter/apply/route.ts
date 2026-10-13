import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { createClient } from "@/lib/supabase/server";

// Normalise "@handle", "handle" or an instagram.com URL to "handle".
function instagramHandle(raw: string): string {
  return raw.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/[/?#].*$/, "");
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json();
  const { business_name, business_type, phone, instagram, website, description } = body;

  const handle = typeof instagram === "string" ? instagramHandle(instagram) : "";
  if (!business_name || !business_type || !description || !phone || !handle) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (body.agreed_terms !== true) {
    return NextResponse.json({ error: "Please agree to the Organiser Terms." }, { status: 400 });
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

  // Short code the applicant puts in their Instagram bio, so we can confirm
  // the real account applied and not an impersonator.
  const code = `QP-${randomInt(1000, 10000)}`;

  // Save application
  const application = {
    user_id: user.id,
    business_name,
    business_type,
    website: website || null,
    instagram: handle,
    phone,
    description,
    status: "pending",
    verification_code: code,
    terms_accepted_at: new Date().toISOString(), // ticked "I agree to the Organiser Terms" (migration 0024)
  };
  let { error } = await supabase.from("promoter_applications").insert(application);
  // Database without migration 0024 yet: save the application without the date.
  if (error?.message.includes("terms_accepted_at")) {
    const { terms_accepted_at: _skip, ...rest } = application;
    ({ error } = await supabase.from("promoter_applications").insert(rest));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Save the applicant's name (the profile row and email already exist,
  // created by the signup trigger).
  if (body.full_name) {
    await supabase.from("profiles").update({ display_name: body.full_name }).eq("id", user.id);
  }

  return NextResponse.json({ success: true, code, instagram: handle });
}
