import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { LEGAL_SLUGS, legalTitle } from "@/content/legal";

export async function generateMetadata() {
  const t = await getTranslations("Account");
  return { title: t("title") };
}

// My account: who's signed in, the policies, and "Delete my account".
export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Account");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/events?signin=1&next=/${locale}/account`);

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile?.role ?? "user";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {user.email && <p className="mt-1 text-sm text-[var(--color-muted)]">{t("signedInAs", { email: user.email })}</p>}
      </div>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-5 space-y-2">
        <h2 className="font-semibold">{t("policies")}</h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {LEGAL_SLUGS.map((s) => (
            <li key={s}><Link href={`/legal/${s}`} className="text-[var(--color-primary)] hover:underline">{legalTitle(s)}</Link></li>
          ))}
        </ul>
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-danger)]/50 p-5 space-y-3">
        <h2 className="font-semibold text-[var(--color-danger)]">{t("deleteTitle")}</h2>
        {role === "admin" ? (
          <p className="text-sm text-[var(--color-muted)]">{t("adminNote")}</p>
        ) : (
          <>
            <p className="text-sm">{t("deleteBody")}</p>
            {role === "promoter" && <p className="text-sm font-medium">{t("deleteBodyOrganiser")}</p>}
            <DeleteAccountButton />
          </>
        )}
      </section>
    </div>
  );
}
