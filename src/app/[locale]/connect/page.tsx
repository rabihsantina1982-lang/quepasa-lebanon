import { setRequestLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { Building2, ChevronRight, BadgeCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { PROFILE_TYPES, isProfileType } from "@/lib/profileTypes";
import { ProfileTypeTag } from "@/components/ProfileTypeTag";
import { isPro } from "@/lib/promotions";

type Listing = {
  id: string;
  business_name: string | null;
  display_name: string | null;
  logo_url: string | null;
  avatar_url: string | null;
  profile_type: string | null;
  bio: string | null;
  pro_until: string | null;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Connect" });
  return { title: t("title"), description: t("subtitle") };
}

// Directory of everyone advertising on the app. Visible to all; contact
// details are on each profile page, for signed-in users only.
export default async function ConnectPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { type } = await searchParams;
  const activeType = isProfileType(type) ? type : null;
  const t = await getTranslations("Connect");
  const tc = await getTranslations("Common");

  let listings: Listing[] = [];
  try {
    const supabase = await createClient();
    // RLS returns only listed profiles (promoters + opted-in admins); the
    // profile_type filter drops anyone who hasn't picked a type yet only when
    // a type chip is active.
    let q = supabase
      .from("profiles")
      .select("id, business_name, display_name, logo_url, avatar_url, profile_type, bio, pro_until")
      .or("role.eq.promoter,profile_type.not.is.null");
    if (activeType) q = q.eq("profile_type", activeType);
    const { data } = await q;
    listings = ((data ?? []) as Listing[])
      .filter((l) => l.business_name || l.display_name)
      // Verified (Pro) businesses first, then alphabetical.
      .sort((a, b) =>
        Number(isPro(b)) - Number(isPro(a)) ||
        (a.business_name ?? a.display_name ?? "").localeCompare(b.business_name ?? b.display_name ?? "")
      );
  } catch {
    // Supabase unreachable — show the empty state.
  }

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full px-3 h-8 text-xs border transition-colors inline-flex items-center",
      active
        ? "bg-[var(--color-fg)] text-[var(--color-bg)] border-[var(--color-fg)]"
        : "bg-transparent border-[var(--color-border)]"
    );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{t("subtitle")}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 sm:flex-wrap sm:overflow-visible">
        <Link href="/connect" className={chip(!activeType)}>{t("all")}</Link>
        {PROFILE_TYPES.map((pt) => (
          <Link key={pt} href={`/connect?type=${pt}`} className={chip(activeType === pt)}>
            {t(`types.${pt}`)}
          </Link>
        ))}
      </div>

      {listings.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] p-8 text-center">
          <p className="text-[var(--color-muted)]">{t("empty")}</p>
          <Link href="/become-a-promoter" className="mt-3 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline">
            {t("joinCta")}
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)]">
          {listings.map((l) => {
            const name = l.business_name ?? l.display_name ?? "";
            const pic = l.logo_url ?? l.avatar_url;
            return (
              <li key={l.id}>
                <Link href={`/promoter/${l.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-bg)] transition-colors">
                  <span className="relative w-12 h-12 shrink-0 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-center">
                    {pic ? (
                      <Image src={pic} alt="" fill sizes="48px" className="object-cover" />
                    ) : (
                      <Building2 size={20} className="text-[var(--color-muted)]" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold truncate">{name}</span>
                      {isPro(l) && <BadgeCheck size={16} className="shrink-0 text-[var(--color-primary)]" aria-label={tc("verified")} />}
                      {isProfileType(l.profile_type) && (
                        <ProfileTypeTag type={l.profile_type} label={t(`types.${l.profile_type}`)} />
                      )}
                    </span>
                    {l.bio && <span className="block text-sm text-[var(--color-muted)] line-clamp-1">{l.bio}</span>}
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-[var(--color-muted)] rtl:rotate-180" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
