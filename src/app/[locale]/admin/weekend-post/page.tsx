import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildWeekendPost, REGION_PARAM } from "@/lib/weekendPost";
import { governorateChips } from "@/lib/regions";
import { cn } from "@/lib/utils";
import { CaptionBox } from "./CaptionBox";

// Ready-made weekly post: images + caption to put on Instagram / WhatsApp.
export default async function WeekendPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}?signin=1&next=/${locale}/admin/weekend-post`);

  const { data: profileRaw } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const profile = profileRaw as { role: string } | null;
  if (profile?.role !== "admin") {
    return <div className="p-8">Admin access required.</div>;
  }

  const tFilters = await getTranslations({ locale: "en", namespace: "Filters" });
  const regionSlug = (await searchParams)[REGION_PARAM];
  const region = governorateChips.find((c) => c.slug === regionSlug);
  const post = await buildWeekendPost(region?.slug, region ? tFilters(region.key) : undefined);

  const query = region ? `&${REGION_PARAM}=${region.slug}` : "";
  const images = [
    { label: "Feed post (4:5)", href: `/api/weekend-image?format=post${query}`, file: "quepasa-weekend-post.png" },
    { label: "Story / WhatsApp status (9:16)", href: `/api/weekend-image?format=story${query}`, file: "quepasa-weekend-story.png" },
  ];

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full px-3 h-8 inline-flex items-center text-xs border",
      active ? "bg-[var(--color-fg)] text-[var(--color-bg)] border-[var(--color-fg)]" : "border-[var(--color-border)]"
    );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-8">
      <nav className="flex gap-2 text-sm">
        <Link href="/admin" className="px-3 py-1.5 rounded-full hover:bg-[var(--color-card)]">Queue</Link>
        <Link href="/admin/analytics" className="px-3 py-1.5 rounded-full hover:bg-[var(--color-card)]">Analytics</Link>
        <Link href="/admin/weekend-post" className="px-3 py-1.5 rounded-full bg-[var(--color-card)] font-medium">Weekly post</Link>
      </nav>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Weekly post · {post.rangeLabel}</h1>
        <p className="text-sm text-[var(--color-muted)]">
          {post.total} events this weekend. Download an image, copy the caption, and post it on Instagram or WhatsApp.
          Featured (boosted) events come first. A reminder email with this kit goes to admins every Thursday morning.
        </p>
        <nav className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <Link href="/admin/weekend-post" className={chip(!region)}>{tFilters("allLebanon")}</Link>
          {governorateChips.map(({ slug, key }) => (
            <Link key={slug} href={`/admin/weekend-post?${REGION_PARAM}=${slug}`} className={chip(region?.slug === slug)}>{tFilters(key)}</Link>
          ))}
        </nav>
      </header>

      <CaptionBox caption={post.caption} />

      <section className="grid gap-6 sm:grid-cols-2">
        {images.map((img) => (
          <div key={img.href} className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{img.label}</h2>
              <a href={img.href} download={img.file} className="text-sm text-[var(--color-primary)] underline">Download</a>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- generated PNG, no optimisation wanted */}
            <img src={img.href} alt={img.label} className="w-full rounded-lg border border-[var(--color-border)]" />
          </div>
        ))}
      </section>
    </div>
  );
}
