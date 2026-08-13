import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmitForm } from "./SubmitForm";
import { fetchCategories } from "@/lib/queries";

export default async function SubmitPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Submit");

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/${locale}?signin=1&next=/${locale}/submit`);
  }
  const categories = await fetchCategories();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-[var(--color-muted)]">{t("subtitle")}</p>
      <SubmitForm categories={categories} locale={locale} />
    </div>
  );
}
