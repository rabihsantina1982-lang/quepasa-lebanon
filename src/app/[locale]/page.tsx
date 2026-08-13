import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

export default async function Home({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const qs = new URLSearchParams(
    Object.entries(sp).filter((entry): entry is [string, string] => entry[1] !== undefined)
  ).toString();
  redirect(`/${locale}/events${qs ? `?${qs}` : ""}`);
}
