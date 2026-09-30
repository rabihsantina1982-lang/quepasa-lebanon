import type { NextRequest } from "next/server";

// Vercel Cron (and manual triggers) authenticate with
// "Authorization: Bearer <CRON_SECRET>". Unset secret = open (local dev only).
export function isAuthorizedCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  return token === cronSecret;
}
