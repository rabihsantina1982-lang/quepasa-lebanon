import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DRAFT, LEGAL_SLUGS, legalDoc, legalTitle, type LegalSlug } from "@/content/legal";

const isSlug = (s: string): s is LegalSlug => (LEGAL_SLUGS as readonly string[]).includes(s);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return isSlug(slug) ? { title: legalTitle(slug) } : {};
}

// Terms and policies (English only for now; text in src/content/legal.ts).
export default async function LegalPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (!isSlug(slug)) notFound();
  const t = await getTranslations("Legal");
  const { title, blocks } = legalDoc(slug);

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 space-y-4" dir="ltr" lang="en">
      {DRAFT && (
        <p className="rounded-[var(--radius-card)] border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm" dir="auto">
          {t("draftBanner")}
        </p>
      )}
      {locale !== "en" && <p className="text-xs text-[var(--color-muted)]" dir="auto">{t("englishOnly")}</p>}
      <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
      <div className="space-y-3 leading-relaxed text-[var(--color-fg)]/90">
        {blocks.map((b, i) =>
          b.kind === "h" ? (
            <h2 key={i} className="pt-3 text-lg font-semibold text-[var(--color-fg)]">{b.text}</h2>
          ) : b.kind === "ul" ? (
            <ul key={i} className="list-disc ps-5 space-y-1">
              {b.items.map((it, j) => <li key={j}>{it}</li>)}
            </ul>
          ) : (
            <p key={i}>{b.text}</p>
          )
        )}
      </div>
      <nav className="pt-6 border-t border-[var(--color-border)] flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {LEGAL_SLUGS.filter((s) => s !== slug).map((s) => (
          <Link key={s} href={`/legal/${s}`} className="text-[var(--color-primary)] hover:underline">{legalTitle(s)}</Link>
        ))}
      </nav>
    </article>
  );
}
