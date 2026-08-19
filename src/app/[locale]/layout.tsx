import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Inter, Noto_Naskh_Arabic } from "next/font/google";
import { routing, isRtl } from "@/i18n/routing";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { HtmlAttributes } from "@/components/HtmlAttributes";
import { SignInAutoOpen } from "@/components/SignInAutoOpen";
import { createClient } from "@/lib/supabase/server";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans-app", display: "swap" });
const arabic = Noto_Naskh_Arabic({ subsets: ["arabic"], variable: "--font-arabic-app", display: "swap" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata = {
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

  let isPromoter = false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      const role = (profile as { role: string } | null)?.role ?? null;
      isPromoter = role === "promoter" || role === "admin";
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
          <Suspense fallback={null}>
            <SignInAutoOpen />
          </Suspense>
        </div>
      </NextIntlClientProvider>
    </>
  );
}
