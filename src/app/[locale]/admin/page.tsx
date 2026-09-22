import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminQueue } from "./AdminQueue";
import { PromoterQueue } from "./PromoterQueue";

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return <div className="p-8 text-[var(--color-muted)]">Set up Supabase to use the admin dashboard.</div>;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}?signin=1&next=/${locale}/admin`);

  const { data: profileRaw } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const profile = profileRaw as { role: string } | null;
  if (profile?.role !== "admin") {
    return <div className="p-8">Admin access required.</div>;
  }

  // Pending event submissions
  const { data: pendingEvents } = await supabase
    .from("events")
    .select("id, slug, title_i18n, starts_at, status, source, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // Pending promoter applications
  const { data: pendingApplications } = await supabase
    .from("promoter_applications")
    .select("id, user_id, business_name, business_type, instagram, website, description, created_at, profiles(display_name, email)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-10">
      <nav className="flex gap-2 text-sm">
        <Link href="/admin" className="px-3 py-1.5 rounded-full bg-[var(--color-card)] font-medium">Queue</Link>
        <Link href="/admin/analytics" className="px-3 py-1.5 rounded-full hover:bg-[var(--color-card)]">Analytics</Link>
      </nav>

      {/* Promoter applications */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-bold">Promoter Applications</h1>
          {(pendingApplications?.length ?? 0) > 0 && (
            <span className="rounded-full bg-[var(--color-accent)] text-white text-xs font-bold px-2 py-0.5">
              {pendingApplications!.length}
            </span>
          )}
        </div>
        <PromoterQueue items={(pendingApplications ?? []) as Parameters<typeof PromoterQueue>[0]["items"]} />
      </section>

      {/* Event submissions */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl font-bold">Event Submissions</h2>
          {(pendingEvents?.length ?? 0) > 0 && (
            <span className="rounded-full bg-[var(--color-accent)] text-white text-xs font-bold px-2 py-0.5">
              {pendingEvents!.length}
            </span>
          )}
        </div>
        <AdminQueue items={(pendingEvents ?? []) as Parameters<typeof AdminQueue>[0]["items"]} />
      </section>

    </div>
  );
}
