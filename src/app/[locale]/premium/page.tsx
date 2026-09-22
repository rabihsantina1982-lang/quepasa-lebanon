import { setRequestLocale } from "next-intl/server";
import { Sparkles, Star, Home, Search, Bell, Share2, Building2 } from "lucide-react";
import type { ReactNode } from "react";

function FeatureCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-2">
      <div className="w-9 h-9 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
        {icon}
      </div>
      <div className="font-semibold">{title}</div>
      <p className="text-sm text-[var(--color-muted)]">{body}</p>
      <span className="inline-block text-xs font-medium text-[var(--color-muted)] border border-[var(--color-border)] rounded-full px-2 py-0.5">
        Pricing coming soon
      </span>
    </div>
  );
}

function ChangelogItem({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-7 h-7 shrink-0 rounded-full bg-[var(--color-card)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)]">
        {icon}
      </div>
      <span className="text-sm pt-1">{text}</span>
    </li>
  );
}

export default async function PremiumPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-12">
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold px-3 py-1">
          <Sparkles size={12} aria-hidden /> COMING SOON
        </div>
        <h1 className="mt-4 text-3xl font-bold">QuePasa Premium</h1>
        <p className="mt-2 text-[var(--color-muted)] max-w-xl mx-auto">
          A first look at new paid features for promoters and businesses. Pricing hasn&apos;t been set yet — we&apos;ll announce it here first.
        </p>
      </div>

      <section>
        <h2 className="text-xl font-bold mb-1">For Businesses</h2>
        <p className="text-sm text-[var(--color-muted)] mb-4">Extra visibility add-ons on top of your Standard or Pro plan.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <FeatureCard
            icon={<Star size={18} aria-hidden />}
            title="Featured Placement"
            body="Pin your event to the top of Browse and search results."
          />
          <FeatureCard
            icon={<Home size={18} aria-hidden />}
            title="Homepage Spotlight"
            body="Get featured in the homepage banner rotation."
          />
          <FeatureCard
            icon={<Search size={18} aria-hidden />}
            title="Priority in Search"
            body="Show first when people search your category or area."
          />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-1">What&apos;s New</h2>
        <p className="text-sm text-[var(--color-muted)] mb-4">Recently added to QuePasa — free for everyone today.</p>
        <ul className="space-y-3">
          <ChangelogItem
            icon={<Bell size={14} aria-hidden />}
            text="Get emailed a reminder 2 days before an event you're interested in."
          />
          <ChangelogItem
            icon={<Share2 size={14} aria-hidden />}
            text="Share any event via WhatsApp or a copied link in one tap."
          />
          <ChangelogItem
            icon={<Building2 size={14} aria-hidden />}
            text="See the business behind every event, with a public promoter profile."
          />
        </ul>
      </section>
    </div>
  );
}
