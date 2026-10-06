import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminQueue, type SubmissionRow } from "./AdminQueue";
import { checkTicketLink } from "@/lib/ticketLinks";
import { ReportQueue, type ReportedEvent } from "./ReportQueue";
import { PromoterQueue } from "./PromoterQueue";
import { PromoterList, type PromoterRow } from "./PromoterList";
import { impersonationWarnings, type NameSource } from "@/lib/impersonation";
import { PromotionQueue, ActivePromotions, type PromotionRequestItem, type ActivePromotion, type ProMember } from "./PromotionQueue";

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

  // Service-role client: profiles.email and other private columns.
  const admin = createAdminClient();

  // Pending event submissions, with who sent them and a check on every ticket link.
  const { data: pendingRows } = await admin
    .from("events")
    .select("id, slug, title_i18n, starts_at, source, created_at, ticket_url, booking_phone, showtimes, submitter:profiles!events_user_id_fkey(business_name, display_name, email, verified_at)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  const pendingEvents = ((pendingRows ?? []) as unknown as Omit<SubmissionRow, "links">[]).map((e) => ({
    ...e,
    links: [...new Set([e.ticket_url, ...(e.showtimes ?? []).map((s) => s.ticket_url)].filter((u): u is string => !!u))]
      .map((url) => ({ url, ...checkTicketLink(url) })),
  }));

  // All promoter applications (pending ones for the queue; the rest supply
  // codes/Instagram for the promoter list and the impersonation check).
  type AppRow = {
    id: string; user_id: string; business_name: string; business_type: string; instagram: string | null;
    phone: string | null; website: string | null; description: string; verification_code: string | null;
    status: string; created_at: string; profiles: { display_name: string | null; email: string | null } | null;
  };
  const [{ data: appRows }, { data: promoterRows }, { data: venueRows }, { data: contactRows }] = await Promise.all([
    admin
      .from("promoter_applications")
      .select("id, user_id, business_name, business_type, instagram, phone, website, description, verification_code, status, created_at, profiles(display_name, email)")
      .order("created_at", { ascending: false }),
    admin
      .from("profiles")
      .select("id, business_name, display_name, email, pro_until, verified_at, suspended_at")
      .eq("role", "promoter")
      .order("business_name", { ascending: true }),
    admin.from("venues").select("name"),
    admin.from("profile_contacts").select("user_id, instagram"),
  ]);
  const applications = (appRows ?? []) as unknown as AppRow[];
  const promoters = (promoterRows ?? []) as Omit<PromoterRow, "instagram" | "verification_code">[];
  const latestApp = new Map<string, AppRow>();
  for (const a of applications) if (!latestApp.has(a.user_id)) latestApp.set(a.user_id, a);
  const contactIg = new Map(((contactRows ?? []) as { user_id: string; instagram: string | null }[]).map((c) => [c.user_id, c.instagram]));

  const promoterList: PromoterRow[] = promoters.map((p) => ({
    ...p,
    instagram: contactIg.get(p.id) || latestApp.get(p.id)?.instagram || null,
    verification_code: latestApp.get(p.id)?.verification_code ?? null,
  }));

  // Who a new applicant might be pretending to be.
  const knownNames: NameSource[] = [
    ...promoterList.map((p) => ({ label: "approved promoter", name: p.business_name ?? p.display_name ?? "", instagram: p.instagram })),
    ...[...new Set(((venueRows ?? []) as { name: string }[]).map((v) => v.name))].map((name) => ({ label: "venue", name })),
  ];
  const pendingApplications = applications
    .filter((a) => a.status === "pending")
    .map((a) => ({
      ...a,
      warnings: impersonationWarnings(a, [
        ...knownNames.filter((n) => !(n.label === "approved promoter" && promoterList.some((p) => p.id === a.user_id && (p.business_name ?? p.display_name) === n.name))),
        ...applications
          .filter((o) => o.id !== a.id && o.user_id !== a.user_id && o.status !== "rejected")
          .map((o) => ({ label: `another ${o.status} application`, name: o.business_name, instagram: o.instagram })),
      ]),
    }));

  // Boost / spotlight / Pro requests, plus what's currently running.
  const nowIso = new Date().toISOString();
  const [{ data: promotionRequests }, { data: activePromotions }, { data: proMembers }] = await Promise.all([
    admin
      .from("promotion_requests")
      .select("id, user_id, kind, duration, use_free_boost, note, created_at, profiles(business_name, display_name, email), events(title_i18n, slug)")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    admin
      .from("event_promotions")
      .select("id, kind, starts_at, ends_at, events(title_i18n, slug)")
      .gt("ends_at", nowIso)
      .order("ends_at", { ascending: true }),
    admin
      .from("profiles")
      .select("id, business_name, display_name, email, pro_until")
      .gt("pro_until", nowIso)
      .order("pro_until", { ascending: true }),
  ]);

  // Open reports from visitors, grouped by event (most-reported first).
  type ReportRow = {
    id: string; event_id: string; user_id: string; reason: ReportedEvent["reports"][number]["reason"]; details: string | null; created_at: string;
    events: { title_i18n: Record<string, string>; slug: string; status: string; user_id: string | null;
      promoter: { business_name: string | null; display_name: string | null } | null } | null;
  };
  const { data: reportRows } = await admin
    .from("event_reports")
    .select("id, event_id, user_id, reason, details, created_at, events(title_i18n, slug, status, user_id, promoter:profiles!events_user_id_fkey(business_name, display_name))")
    .eq("status", "open")
    .order("created_at", { ascending: true });
  const reports = (reportRows ?? []) as unknown as ReportRow[];
  const reporterIds = [...new Set(reports.map((r) => r.user_id))];
  const { data: reporterRows } = reporterIds.length
    ? await admin.from("profiles").select("id, email").in("id", reporterIds)
    : { data: [] };
  const reporterEmail = new Map(((reporterRows ?? []) as { id: string; email: string | null }[]).map((p) => [p.id, p.email]));
  const reportedEvents = new Map<string, ReportedEvent>();
  for (const r of reports) {
    const e = r.events;
    const group = reportedEvents.get(r.event_id) ?? {
      eventId: r.event_id,
      title: e?.title_i18n.en ?? e?.slug ?? "Deleted event",
      slug: e?.slug ?? "",
      status: e?.status ?? "deleted",
      promoter: e?.promoter?.business_name ?? e?.promoter?.display_name ?? null,
      reports: [],
    };
    group.reports.push({ id: r.id, reason: r.reason, details: r.details, created_at: r.created_at, reporter: reporterEmail.get(r.user_id) ?? null });
    reportedEvents.set(r.event_id, group);
  }
  const reportQueue = [...reportedEvents.values()].sort((a, b) => b.reports.length - a.reports.length);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-10">
      <nav className="flex gap-2 text-sm">
        <Link href="/admin" className="px-3 py-1.5 rounded-full bg-[var(--color-card)] font-medium">Queue</Link>
        <Link href="/admin/analytics" className="px-3 py-1.5 rounded-full hover:bg-[var(--color-card)]">Analytics</Link>
      </nav>

      {/* Visitor reports */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl font-bold">Reports</h2>
          {reportQueue.length > 0 && (
            <span className="rounded-full bg-[var(--color-danger)] text-white text-xs font-bold px-2 py-0.5">{reportQueue.length}</span>
          )}
        </div>
        <ReportQueue items={reportQueue} />
      </section>

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
        <PromoterQueue items={pendingApplications} />
      </section>

      {/* Approved promoters: verify / suspend */}
      <section>
        <h2 className="text-2xl font-bold mb-1">Promoters</h2>
        <p className="text-sm text-[var(--color-muted)] mb-4">
          Verify ✓ only after seeing their code in their Instagram bio. Suspend hides all their events and profile and stops them posting.
        </p>
        <PromoterList items={promoterList} />
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
        <AdminQueue items={pendingEvents} />
      </section>

      {/* Paid visibility */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl font-bold">Boost, Spotlight &amp; Pro Requests</h2>
          {(promotionRequests?.length ?? 0) > 0 && (
            <span className="rounded-full bg-[var(--color-accent)] text-white text-xs font-bold px-2 py-0.5">
              {promotionRequests!.length}
            </span>
          )}
        </div>
        <PromotionQueue items={(promotionRequests ?? []) as unknown as PromotionRequestItem[]} />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Running Now</h2>
        <ActivePromotions
          promotions={(activePromotions ?? []) as unknown as ActivePromotion[]}
          proMembers={(proMembers ?? []) as ProMember[]}
        />
      </section>

    </div>
  );
}
