import { setRequestLocale } from "next-intl/server";
import { Sparkles, Star, Home, Check, CalendarPlus, Bell, Share2, Building2 } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PRICING, price } from "@/lib/pricing";

function PlanCard({
  icon,
  name,
  amount,
  per,
  points,
  highlight = false,
}: {
  icon: ReactNode;
  name: string;
  amount: string;
  per?: string;
  points: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius-card)] bg-[var(--color-card)] p-5 space-y-3 ${
        highlight ? "border-2 border-[var(--color-primary)]" : "border border-[var(--color-border)]"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
          {icon}
        </div>
        <div className="font-semibold">{name}</div>
      </div>
      <div className="text-3xl font-bold">
        {amount}
        {per && <span className="text-sm font-normal text-[var(--color-muted)]"> / {per}</span>}
      </div>
      <ul className="space-y-1.5 text-sm">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2">
            <Check size={14} className="mt-0.5 shrink-0 text-[var(--color-primary)]" aria-hidden />
            <span>{p}</span>
          </li>
        ))}
      </ul>
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
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-12">
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold px-3 py-1">
          <Sparkles size={12} aria-hidden /> FOR PROMOTERS &amp; BUSINESSES
        </div>
        <h1 className="mt-4 text-3xl font-bold">List for free. Pay only to stand out.</h1>
        <p className="mt-2 text-[var(--color-muted)] max-w-xl mx-auto">
          Every event on QuePasa is listed free, with your ticket or booking link. When you want more people to see it,
          boost it, put it in the spotlight, or go Pro.
        </p>
      </div>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <PlanCard
          icon={<CalendarPlus size={18} aria-hidden />}
          name="Free"
          amount="$0"
          per="forever"
          points={[
            "Unlimited events",
            "Your ticket or booking link",
            "Business profile in the Connect directory",
            "Free ✓ Verified badge once we confirm it's really you",
            "Views and saves for every event",
          ]}
        />
        <PlanCard
          icon={<Sparkles size={18} aria-hidden />}
          name="Boost"
          amount={price(PRICING.boostPerWeek)}
          per="event / week"
          points={[
            "Pinned to the top of Browse, in its category and region",
            "Featured badge on the event",
            "Stacks with other weeks",
          ]}
        />
        <PlanCard
          icon={<Home size={18} aria-hidden />}
          name="Homepage spotlight"
          amount={price(PRICING.spotlightPerWeek)}
          per="event / week"
          points={[
            "Big banner at the top of the homepage",
            "Also boosted in Browse",
            "Only a few spots at a time",
          ]}
        />
        <PlanCard
          highlight
          icon={<Star size={18} aria-hidden />}
          name="Pro"
          amount={price(PRICING.proPerMonth)}
          per="month"
          points={[
            "Ticket clicks: exactly how many people we send to your ticket page",
            "Reminders, shares, and your audience's age and gender",
            "Listed near the top of the Connect directory",
            `${PRICING.proFreeBoostsPerMonth} free boost week every month`,
          ]}
        />
      </section>

      <div className="text-center space-y-2">
        <Link href="/promoter">
          <Button size="lg" variant="primary">Go to your dashboard</Button>
        </Link>
        <p className="text-xs text-[var(--color-muted)]">
          Not a promoter yet? <Link href="/become-a-promoter" className="text-[var(--color-primary)] underline">Apply here</Link>.
          New promoters get Pro free for {PRICING.proWelcomeMonths} months. Request a boost, spotlight or Pro from your
          dashboard, and we&apos;ll contact you to confirm. No payment is taken in the app.
        </p>
      </div>

      <section>
        <h2 className="text-xl font-bold mb-1">What&apos;s New</h2>
        <p className="text-sm text-[var(--color-muted)] mb-4">Recently added to QuePasa, free for everyone.</p>
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
