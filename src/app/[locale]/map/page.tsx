import { setRequestLocale } from "next-intl/server";
import { fetchEvents } from "@/lib/queries";
import { MapView } from "./MapView";

export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const events = await fetchEvents({ limit: 200 });
  const pins = events
    .filter((e) => e.venue?.lat != null && e.venue?.lng != null)
    .map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title_i18n[locale] ?? e.title_i18n.en ?? "",
      lat: e.venue!.lat!,
      lng: e.venue!.lng!,
      starts_at: e.starts_at,
      cover_image: e.cover_image,
    }));
  return <MapView pins={pins} locale={locale} />;
}
