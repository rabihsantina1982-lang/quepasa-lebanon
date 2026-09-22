import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickLocalized } from "@/lib/utils";
import { BarList, StatCard } from "./AnalyticsUI";

const AGE_BUCKETS = ["Under 18", "18–24", "25–34", "35–44", "45–54", "55+", "Not provided"] as const;
const GENDER_LABELS: Record<string, string> = { male: "Male", female: "Female", non_binary: "Non-binary" };

function ageGroup(dob: string | null): (typeof AGE_BUCKETS)[number] {
  if (!dob) return "Not provided";
  const ageMs = Date.now() - new Date(dob).getTime();
  const age = Math.floor(ageMs / (365.25 * 24 * 3600 * 1000));
  if (age < 18) return "Under 18";
  if (age <= 24) return "18–24";
  if (age <= 34) return "25–34";
  if (age <= 44) return "35–44";
  if (age <= 54) return "45–54";
  return "55+";
}

function tally<T extends string>(items: T[]): Record<T, number> {
  const counts = {} as Record<T, number>;
  for (const item of items) counts[item] = (counts[item] ?? 0) + 1;
  return counts;
}

export default async function AdminAnalyticsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return <div className="p-8 text-[var(--color-muted)]">Set up Supabase to use the admin dashboard.</div>;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}?signin=1&next=/${locale}/admin/analytics`);

  const { data: profileRaw } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const profile = profileRaw as { role: string } | null;
  if (profile?.role !== "admin") {
    return <div className="p-8">Admin access required.</div>;
  }

  // This page only reads aggregate data and is already gated on role==='admin'
  // above, so the service-role client is used to read across all users
  // without needing extra admin RLS policies on every table involved.
  const admin = createAdminClient();

  const [{ data: consumers }, { data: categories }, { data: favorites }, { data: reminders }, { data: shares }] =
    await Promise.all([
      admin.from("profiles").select("gender, date_of_birth, interests, onboarding_completed_at").eq("role", "user"),
      admin.from("categories").select("id, slug, name_i18n, icon"),
      admin.from("favorites").select("event_id, events(category_id)"),
      admin.from("reminders").select("event_id, events(category_id)"),
      admin.from("share_events").select("event_id, channel, events(slug, title_i18n)"),
    ]);

  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));
  const categoryLabel = (id: number | null) => {
    const c = id != null ? categoryById.get(id) : null;
    return c ? `${c.icon ?? ""} ${pickLocalized(c.name_i18n, "en")}`.trim() : "Uncategorized";
  };

  const totalConsumers = consumers?.length ?? 0;
  const onboardedCount = consumers?.filter((c) => c.onboarding_completed_at).length ?? 0;

  const genderCounts = tally((consumers ?? []).map((c) => (c.gender ? GENDER_LABELS[c.gender] ?? c.gender : "Not provided")));
  const ageCounts = tally((consumers ?? []).map((c) => ageGroup(c.date_of_birth)));
  const interestCounts = tally(
    (consumers ?? []).flatMap((c) => (Array.isArray(c.interests) ? c.interests : []) as string[])
  );
  const interestBars = Object.entries(interestCounts)
    .map(([slug, count]) => {
      const c = (categories ?? []).find((cat) => cat.slug === slug);
      return { label: c ? `${c.icon ?? ""} ${pickLocalized(c.name_i18n, "en")}`.trim() : slug, count };
    })
    .sort((a, b) => b.count - a.count);

  type WithCategory = { events: { category_id: number | null } | { category_id: number | null }[] | null };
  function categoryIdOf(row: WithCategory): number | null {
    const ev = Array.isArray(row.events) ? row.events[0] : row.events;
    return ev?.category_id ?? null;
  }
  const favoriteBars = Object.entries(tally((favorites ?? []).map((f) => categoryLabel(categoryIdOf(f)))))
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
  const reminderBars = Object.entries(tally((reminders ?? []).map((r) => categoryLabel(categoryIdOf(r)))))
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  type ShareRow = { event_id: string; channel: string; events: { slug: string; title_i18n: Record<string, string> } | { slug: string; title_i18n: Record<string, string> }[] | null };
  const shareByEvent = new Map<string, { title: string; count: number }>();
  for (const s of (shares ?? []) as ShareRow[]) {
    const ev = Array.isArray(s.events) ? s.events[0] : s.events;
    const title = ev ? pickLocalized(ev.title_i18n, "en") || ev.slug : s.event_id;
    const entry = shareByEvent.get(s.event_id) ?? { title, count: 0 };
    entry.count++;
    shareByEvent.set(s.event_id, entry);
  }
  const topSharedEvents = [...shareByEvent.values()].sort((a, b) => b.count - a.count).slice(0, 10)
    .map((e) => ({ label: e.title, count: e.count }));
  const shareChannelCounts = tally((shares ?? []).map((s) => (s.channel === "whatsapp" ? "WhatsApp" : "Copy link")));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-10">
      <nav className="flex gap-2 text-sm">
        <Link href="/admin" className="px-3 py-1.5 rounded-full hover:bg-[var(--color-card)]">Queue</Link>
        <Link href="/admin/analytics" className="px-3 py-1.5 rounded-full bg-[var(--color-card)] font-medium">Analytics</Link>
      </nav>

      <section>
        <h1 className="text-2xl font-bold mb-4">Consumer analytics</h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Consumer accounts" value={totalConsumers} />
          <StatCard label="Completed profile" value={`${onboardedCount}/${totalConsumers || 0}`} />
          <StatCard label="Total saves" value={favorites?.length ?? 0} />
          <StatCard label="Total shares" value={shares?.length ?? 0} />
        </div>
      </section>

      <div className="grid sm:grid-cols-2 gap-8">
        <section>
          <h2 className="text-lg font-semibold mb-3">Gender</h2>
          <BarList items={Object.entries(genderCounts).map(([label, count]) => ({ label, count }))} />
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-3">Age groups</h2>
          <BarList items={AGE_BUCKETS.map((label) => ({ label, count: ageCounts[label] ?? 0 }))} />
        </section>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Interests (from onboarding)</h2>
        <BarList items={interestBars} emptyLabel="No interests selected yet." />
      </section>

      <div className="grid sm:grid-cols-2 gap-8">
        <section>
          <h2 className="text-lg font-semibold mb-3">Most-saved categories</h2>
          <BarList items={favoriteBars} emptyLabel="No saves yet." />
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-3">Most-reminded categories</h2>
          <BarList items={reminderBars} emptyLabel="No reminders set yet." />
        </section>
      </div>

      <div className="grid sm:grid-cols-2 gap-8">
        <section>
          <h2 className="text-lg font-semibold mb-3">Top shared events</h2>
          <BarList items={topSharedEvents} emptyLabel="No shares yet." />
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-3">Share channel</h2>
          <BarList items={Object.entries(shareChannelCounts).map(([label, count]) => ({ label, count }))} emptyLabel="No shares yet." />
        </section>
      </div>
    </div>
  );
}
