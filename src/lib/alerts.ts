// Email admins when something breaks (page errors, failed nightly jobs, the
// daily health check). Throttled per problem via the error_alerts table so a
// repeating error sends one email every THROTTLE_HOURS, with a count.
// Server only. Never throws: alerting must not break the request itself.
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "./supabase/admin";
import { emailAdmins } from "./duplicateCheck";

const THROTTLE_HOURS = 6;
const SITE_NAME = "QuePasa Lebanon";

const recentlySent = new Map<string, number>();

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export async function alertAdmins(key: string, subject: string, details: string): Promise<void> {
  try {
    if (process.env.NODE_ENV !== "production") return; // no emails from local testing
    const admin = createAdminClient();
    const { data: row, error } = await admin.from("error_alerts").select("last_sent_at, count").eq("key", key).maybeSingle();
    const now = new Date();
    if (error) {
      // No error_alerts table yet: throttle within this server instance only.
      const last = recentlySent.get(key) ?? 0;
      if (now.getTime() - last < THROTTLE_HOURS * 3600 * 1000) return;
      recentlySent.set(key, now.getTime());
    } else {
      if (row && now.getTime() - new Date(row.last_sent_at).getTime() < THROTTLE_HOURS * 3600 * 1000) {
        // Recently emailed: just count it.
        await admin.from("error_alerts").update({ count: row.count + 1, last_message: details.slice(0, 2000) }).eq("key", key);
        return;
      }
      await admin.from("error_alerts").upsert({ key, last_sent_at: now.toISOString(), count: 1, last_message: details.slice(0, 2000) });
    }
    const repeats = row && row.count > 1 ? `<p>It also happened ${row.count - 1} more time(s) since the last email.</p>` : "";
    await emailAdmins(
      admin,
      `[${SITE_NAME}] ${subject}`,
      `<p><strong>${esc(subject)}</strong></p>
       <pre style="white-space:pre-wrap;font-size:12px;background:#f4f4f4;padding:8px">${esc(details.slice(0, 2000))}</pre>
       ${repeats}
       <p>You'll get at most one email about this every ${THROTTLE_HOURS} hours. Forward this to your developer if it keeps happening.</p>`
    );
  } catch {
    // ignore: never let alerting break anything
  }
}

// Wraps a cron route: a crash or a 5xx answer emails the admins.
export function withCronAlert(name: string, handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest): Promise<Response> => {
    try {
      const res = await handler(req);
      if (res.status >= 500) {
        const body = await res.clone().text().catch(() => "");
        await alertAdmins(`cron:${name}`, `Nightly job failed: ${name}`, body || `HTTP ${res.status}`);
      }
      return res;
    } catch (err) {
      const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
      await alertAdmins(`cron:${name}`, `Nightly job crashed: ${name}`, msg);
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  };
}
