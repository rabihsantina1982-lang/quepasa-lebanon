import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Site footer: terms and policies. Sits above the phone bottom bar.
export async function Footer() {
  const t = await getTranslations("Footer");
  const links: [string, string][] = [
    ["/legal/terms", t("terms")],
    ["/legal/privacy", t("privacy")],
    ["/legal/cookies", t("cookies")],
    ["/legal/guidelines", t("guidelines")],
    ["/legal/organiser-terms", t("organiserTerms")],
    ["/legal/promotion-terms", t("promotionTerms")],
  ];
  return (
    <footer className="border-t border-[var(--color-border)] mt-10">
      <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-[var(--color-muted)]">
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="hover:underline hover:text-[var(--color-fg)]">{label}</Link>
          ))}
        </nav>
        <span>© {new Date().getFullYear()} QuePasa</span>
      </div>
    </footer>
  );
}
