import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import type { EventWithRelations } from "@/lib/supabase/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const locale = new URL(request.url).searchParams.get("locale") ?? "en";
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*, category:categories(*), venue:venues(*), media:event_media(*)")
    .eq("id", eventId)
    .single();
  if (!data) return new Response("Not found", { status: 404 });
  return NextResponse.redirect(buildGoogleCalendarUrl(data as unknown as EventWithRelations, locale));
}
