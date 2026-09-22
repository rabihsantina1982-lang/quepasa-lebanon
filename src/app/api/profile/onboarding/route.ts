/**
 * POST /api/profile/onboarding
 * Body: { date_of_birth?: string, gender?: "male"|"female"|"non_binary", interests?: string[] }
 *
 * Saves the one-time "complete your profile" details for a signed-in
 * consumer account. Always stamps onboarding_completed_at so the prompt
 * never shows again, whether the user filled fields in or skipped.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Gender } from "@/lib/supabase/types";

const VALID_GENDERS: Gender[] = ["male", "female", "non_binary"];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = { onboarding_completed_at: new Date().toISOString() };

  if (body.date_of_birth) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date_of_birth)) {
      return NextResponse.json({ error: "Invalid date_of_birth" }, { status: 400 });
    }
    update.date_of_birth = body.date_of_birth;
  }
  if (body.gender) {
    if (!VALID_GENDERS.includes(body.gender)) {
      return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
    }
    update.gender = body.gender;
  }
  if (Array.isArray(body.interests)) {
    update.interests = body.interests.filter((s: unknown) => typeof s === "string");
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
