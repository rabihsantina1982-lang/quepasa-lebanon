import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Inter, Noto_Naskh_Arabic } from "next/font/google";
import { routing, isRtl } from "@/i18n/routing";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { HtmlAttributes } from "@/components/HtmlAttributes";
import { SignInAutoOpen } from "@/components/SignInAutoOpen";
import { CompleteProfileDialog } from "@/components/CompleteProfileDialog";
import { createClient } from "@/lib/supabase/server";
import { fetchCategories } from "@/lib/queries";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans-app", display: "swap" });
const arabic = Noto_Naskh_Arabic({ subsets: ["arabic"], variable: "--font-arabic-app", display: "swap" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata = {
  // Link previews (WhatsApp, iMessage, ...) need absolute URLs.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: { siteName: "QuePasa Lebanon", type: "website" },
  title: { default: "QuePasa Lebanon", template: "%s · QuePasa Lebanon" },
  description: "Everything happening in Lebanon — concerts, festivals, exhibitions, sports, family days out.",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const dir = isRtl(locale) ? "rtl" : "ltr";

  // Every page depends on the signed-in session (read below) and on the
  // ?signin= query read by SignInAutoOpen, so render per request. Without
  // this, the session lookup's dynamic-usage error is swallowed by the catch
  // below and pages with no data of their own fail at build time.
  await connection();

  let isPromoter = false;
  let shouldPromptOnboarding = false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, onboarding_completed_at")
        .eq("id", data.user.id)
        .maybeSingle();
      const role = (profile as { role: string } | null)?.role ?? null;
      isPromoter = role === "promoter" || role === "admin";
      // Demographics onboarding is for consumer ("user") accounts only —
      // promoters/admins are businesses with their own profile flow.
      shouldPromptOnboarding = role === "user" && !(profile as { onboarding_completed_at: string | null } | null)?.onboarding_completed_at;
    }
  } catch {
    // Supabase env not configured yet — render anonymous.
  }

  return (
    <>
      <HtmlAttributes lang={locale} dir={dir} />
      <NextIntlClientProvider>
        <div className={`min-h-screen flex flex-col pb-16 lg:pb-0 ${inter.variable} ${arabic.variable}`}>
          <Header />
          <main className="flex-1">{children}</main>
          <BottomNav isPromoter={isPromoter} />
          <SignInAutoOpen />
          {shouldPromptOnboarding && <CompleteProfileDialog categories={await fetchCategories()} />}
        </div>
      </NextIntlClientProvider>
    </>
  );
}
