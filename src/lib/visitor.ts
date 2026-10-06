// Server-side throttling for the stats endpoints (/api/track,
// /api/share/track), so views, ticket clicks and shares can't be inflated
// by reloading or scripting. Rows are written with the service-role client;
// direct inserts with the anon key are blocked (migration 0021).

import { createHmac } from "crypto";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// The same visitor counts once per event (and kind/channel) in this window.
export const REPEAT_WINDOW_MINUTES = { view: 30, ticket_click: 10, share: 10 } as const;
// Beyond this many counted actions an hour, a visitor is ignored (scripts).
const HOURLY_CAP = 120;

// Signed-in users by account; everyone else by a keyed hash of IP + browser,
// so no raw IP is stored and the hash can't be reversed without the key.
export function visitorId(req: NextRequest, userId: string | null): string {
  if (userId) return `u:${userId}`;
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = req.headers.get("user-agent") ?? "";
  const hash = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").update(`${ip}|${ua}`).digest("base64url");
  return `a:${hash.slice(0, 22)}`;
}

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60000).toISOString();
}

// A published event that exists, and whose owner isn't the one acting.
export async function countableEvent(admin: SupabaseClient, eventId: string, userId: string | null): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return false;
  const { data } = await admin.from("events").select("user_id, status").eq("id", eventId).maybeSingle();
  return !!data && data.status === "published" && (!userId || data.user_id !== userId);
}

// True if this visitor already did the same thing recently, or hit the hourly cap.
export async function isRepeat(
  admin: SupabaseClient,
  table: "event_activity" | "share_events",
  visitor: string,
  match: Record<string, string>,
  windowMinutes: number
): Promise<boolean> {
  const count = (t: string, since: string, m: Record<string, string> = {}) =>
    admin.from(t).select("id", { count: "exact", head: true }).eq("visitor", visitor).match(m).gte("created_at", since);
  const hourAgo = minutesAgo(60);
  const [recent, activityHour, sharesHour] = await Promise.all([
    count(table, minutesAgo(windowMinutes), match),
    count("event_activity", hourAgo),
    count("share_events", hourAgo),
  ]);
  return (recent.count ?? 0) > 0 || (activityHour.count ?? 0) + (sharesHour.count ?? 0) >= HOURLY_CAP;
}
