import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Star } from "lucide-react";

export default async function PromoterDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/events`);

  // Check profile role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  // Check application status
  const { data: application } = await supabase
    .from("promoter_applications")
    .select("status, business_name, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  // Not a promoter yet
  if (profile?.role !== "promoter" && profile?.role !== "admin") {
    if (application?.status === "pending") {
      return (
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className="text-4xl mb-4">⏳</div>
          <h1 className="text-2xl font-bold">Application under review</h1>
          <p className="mt-3 text-[var(--color-muted)]">
            Your application for <strong>{application.business_name}</strong> is being reviewed.
            We'll notify you within 2 business days.
          </p>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="text-4xl mb-4">🎤</div>
        <h1 className="text-2xl font-bold">Become a Promoter</h1>
        <p className="mt-3 text-[var(--color-muted)]">
          Apply to list your events on QuePasa and reach thousands of people across Lebanon.
          First 3 months are completely free.
        </p>
        <Link href="/become-a-promoter">
          <Button size="lg" variant="primary" className="mt-6">Apply now</Button>
        </Link>
      </div>
    );
  }

  // Get subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status, trial_ends_at, posts_used_this_month")
    .eq("user_id", user.id)
    .maybeSingle();

  const isTrial = subscription?.plan === "trial";
  const trialEnds = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const trialDaysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / 86400000)) : 0;
  const isStandard = subscription?.plan === "standard";
  const postsUsed = subscription?.posts_used_this_month ?? 0;
  const postsLimit = isStandard ? 5 : null; // null = unlimited
  const canPost = !isStandard || postsUsed < 5;

  // Get their events
  const { data: myEvents } = await supabase
    .from("events")
    .select("id, slug, title_i18n, starts_at, status, created_at")
    .eq("source", "promoter")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Promoter Dashboard</h1>
          <p className="text-sm text-[var(--color-muted)]">{application?.business_name}</p>
        </div>
        {canPost && (
          <Link href="/promoter/new-event">
            <Button size="lg" variant="primary"><Plus size={16} /> New event</Button>
          </Link>
        )}
      </div>

      {/* Subscription status */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-5 space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <Star size={16} className="text-[var(--color-primary)]" />
          Subscription
        </div>

        {isTrial && (
          <div className="flex items-center justify-between">
            <div>
              <span className="rounded-full bg-[var(--color-primary)] text-white text-xs font-bold px-3 py-1">FREE TRIAL</span>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {trialDaysLeft > 0 ? `${trialDaysLeft} days remaining` : "Trial expired — please choose a plan"}
              </p>
            </div>
            <div className="text-right text-sm">
              <div className="font-medium">Unlimited events</div>
              <div className="text-[var(--color-muted)]">during trial</div>
            </div>
          </div>
        )}

        {isStandard && (
          <div className="flex items-center justify-between">
            <div>
              <span className="rounded-full bg-[var(--color-border)] text-sm font-bold px-3 py-1">STANDARD · $40/mo</span>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                {postsUsed} of 5 events used this month
              </p>
            </div>
            {!canPost && (
              <span className="text-xs text-[var(--color-danger)]">Monthly limit reached — upgrade to Pro</span>
            )}
          </div>
        )}

        {subscription?.plan === "pro" && (
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-[var(--color-primary)] text-white text-xs font-bold px-3 py-1">PRO · $80/mo</span>
            <div className="text-sm text-[var(--color-muted)]">Unlimited events</div>
          </div>
        )}
      </div>

      {/* Events list */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Calendar size={16} /> My Events
        </h2>
        {(!myEvents || myEvents.length === 0) ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] p-8 text-center">
            <p className="text-[var(--color-muted)]">You haven't posted any events yet.</p>
            {canPost && (
              <Link href="/promoter/new-event">
                <Button size="sm" variant="primary" className="mt-3"><Plus size={14} /> Post your first event</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {myEvents.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--color-border)] px-4 py-3">
                <div>
                  <div className="font-medium">{(ev.title_i18n as Record<string, string>).en ?? ev.slug}</div>
                  <div className="text-xs text-[var(--color-muted)]">{new Date(ev.starts_at).toLocaleDateString()}</div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  ev.status === "published" ? "bg-green-100 text-green-700" :
                  ev.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {ev.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
