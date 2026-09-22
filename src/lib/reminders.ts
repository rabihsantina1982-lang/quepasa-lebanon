import { createAdminClient } from "./supabase/admin";
import { pickLocalized, formatDateRange } from "./utils";

// How long before an event's start time the default reminder fires.
export const REMINDER_OFFSET_DAYS = 2;

export function computeRemindAt(startsAt: string): string {
  const d = new Date(startsAt);
  d.setDate(d.getDate() - REMINDER_OFFSET_DAYS);
  return d.toISOString();
}

interface DueReminderRow {
  id: string;
  user_id: string;
  locale: string;
  events: {
    slug: string;
    title_i18n: Record<string, string>;
    starts_at: string;
    ends_at: string | null;
    timezone: string;
    venues: { name: string; area: string | null } | null;
  } | null;
}

export interface SendRemindersResult {
  sent: number;
  skipped: number;
  errors: string[];
}

export async function sendDueReminders(): Promise<SendRemindersResult> {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.REMINDERS_FROM_EMAIL;
  if (!resendKey || !fromEmail) {
    throw new Error("RESEND_API_KEY / REMINDERS_FROM_EMAIL not set in environment variables.");
  }

  const supabase = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data, error } = await supabase
    .from("reminders")
    .select("id, user_id, locale, events(slug, title_i18n, starts_at, ends_at, timezone, venues(name, area))")
    .lte("remind_at", new Date().toISOString())
    .is("sent_at", null)
    .limit(200);

  if (error) throw error;
  const due = (data ?? []) as unknown as DueReminderRow[];
  if (due.length === 0) return { sent: 0, skipped: 0, errors: [] };

  // reminders.user_id references auth.users, not public.profiles, so
  // PostgREST can't embed profiles directly — fetch them separately.
  const userIds = [...new Set(due.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .in("id", userIds);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const reminder of due) {
    try {
      const profile = profileById.get(reminder.user_id);
      const email = profile?.email;
      const event = reminder.events;
      if (!email || !event) {
        // Nothing to send to, or the event/profile was deleted — mark sent
        // so it stops being picked up on every future run.
        await supabase.from("reminders").update({ sent_at: new Date().toISOString() }).eq("id", reminder.id);
        skipped++;
        continue;
      }

      const locale = reminder.locale || "en";
      const title = pickLocalized(event.title_i18n, locale);
      const when = formatDateRange(event.starts_at, event.ends_at, locale, event.timezone);
      const where = event.venues ? [event.venues.name, event.venues.area].filter(Boolean).join(", ") : null;
      const eventUrl = `${siteUrl}/${locale}/events/${event.slug}`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: email,
          subject: `Reminder: ${title} is coming up`,
          html: `
            <p>Hi${profile?.display_name ? ` ${profile.display_name}` : ""},</p>
            <p>This is a reminder that <strong>${title}</strong> is coming up.</p>
            <p>${when}${where ? `<br/>${where}` : ""}</p>
            <p><a href="${eventUrl}">View event details</a></p>
          `,
        }),
      });

      if (!res.ok) {
        throw new Error(`Resend API returned ${res.status}: ${await res.text()}`);
      }

      await supabase.from("reminders").update({ sent_at: new Date().toISOString() }).eq("id", reminder.id);
      sent++;
    } catch (err) {
      errors.push(`reminder ${reminder.id}: ${String(err)}`);
    }
  }

  return { sent, skipped, errors };
}
