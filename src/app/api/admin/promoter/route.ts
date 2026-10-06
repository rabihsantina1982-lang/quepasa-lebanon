/**
 * POST /api/admin/promoter
 * Body: { applicationId: string, action: "approve" | "reject", verify?: boolean }
 * Admin only — approves or rejects a promoter application.
 * On approval: sets profile role to "promoter" and gives them Pro free for
 * PRICING.proWelcomeMonths months. verify: also give the Verified badge (the
 * admin has seen the application's code in the applicant's Instagram bio). Listing events is free for every promoter.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toProfileType } from "@/lib/profileTypes";
import { PRICING } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Verify admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { applicationId, action, verify } = await req.json();
  if (!applicationId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Get the application
  const { data: application } = await supabase
    .from("promoter_applications")
    .select("user_id, business_name, business_type")
    .eq("id", applicationId)
    .single();

  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  // Update application status
  await supabase
    .from("promoter_applications")
    .update({ status: action === "approve" ? "approved" : "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", applicationId);

  if (action === "approve") {
    // Set user role to promoter, carry their business name onto the profile
    // so it's ready to show on their events, and start their free Pro months.
    const proUntil = new Date();
    proUntil.setMonth(proUntil.getMonth() + PRICING.proWelcomeMonths);
    await supabase
      .from("profiles")
      .update({
        role: "promoter",
        business_name: application.business_name,
        profile_type: toProfileType(application.business_type),
        pro_until: proUntil.toISOString(),
        ...(verify === true ? { verified_at: new Date().toISOString() } : {}),
      })
      .eq("id", application.user_id);
  }

  return NextResponse.json({ success: true });
}
