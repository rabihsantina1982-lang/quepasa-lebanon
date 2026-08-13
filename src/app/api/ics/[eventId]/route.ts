import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildIcs } from "@/lib/calendar";
import type { EventWithRelations } from "@/lib/supabase/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const locale = new URL(request.url).searchParams.get("locale") ?? "en";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*, category:categories(*), venue:venues(*), media:event_media(*)")
    .eq("id", eventId)
    .single();
  if (error || !data) return new Response("Not found", { status: 404 });

  const ics = buildIcs(data as unknown as EventWithRelations, locale);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="event-${eventId}.ics"`,
    },
  });
}
