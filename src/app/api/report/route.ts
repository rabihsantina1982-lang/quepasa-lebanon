/**
 * POST /api/report
 * Body: { eventId: string, reason: ReportReason, details?: string }
 * Returns: { ok: true } or { error, already?: true }
 *
 * Signed-in visitors report a problem with a published event. One open
 * report per person per event (enforced by a unique index, migration 0020).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { REPORT_REASONS } from "@/lib/reports";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { eventId, reason, details } = await req.json().catch(() => ({}));
  if (typeof eventId !== "string" || !REPORT_REASONS.includes(reason)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { error } = await supabase.from("event_reports").insert({
    event_id: eventId,
    user_id: user.id,
    reason,
    details: typeof details === "string" && details.trim() ? details.trim().slice(0, 1000) : null,
  });
  if (error?.code === "23505") return NextResponse.json({ error: "Already reported", already: true }, { status: 409 });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
