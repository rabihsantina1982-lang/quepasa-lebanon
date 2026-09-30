import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewEventForm, type NewEventInitial } from "./NewEventForm";

export default async function NewEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ copy?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { copy } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}?signin=1&next=/${locale}/promoter/new-event`);

  const { data: profileRaw } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const profile = profileRaw as { role: string } | null;
  if (profile?.role !== "promoter" && profile?.role !== "admin") {
    redirect(`/${locale}/promoter`);
  }

  // "Duplicate": pre-fill from one of this promoter's own events. Dates are
  // deliberately left empty so the promoter always picks new ones.
  let initial: NewEventInitial | undefined;
  if (copy) {
    const { data: src } = await supabase
      .from("events")
      .select("title_i18n, description_i18n, category_id, governorate, ticket_url, booking_phone, price_min, price_max, tags, venue:venues(name, area), media:event_media(url, kind, position)")
      .eq("id", copy)
      .eq("user_id", user.id)
      .maybeSingle();
    if (src) {
      const ev = src as unknown as {
        title_i18n: Record<string, string>;
        description_i18n: Record<string, string>;
        category_id: number | null;
        governorate: string | null;
        ticket_url: string | null;
        booking_phone: string | null;
        price_min: number | null;
        price_max: number | null;
        tags: string[] | null;
        venue: { name: string; area: string | null } | null;
        media: { url: string; kind: "image" | "video"; position: number }[];
      };
      initial = {
        title: ev.title_i18n.en ?? "",
        description: ev.description_i18n.en ?? "",
        category_id: ev.category_id != null ? String(ev.category_id) : "",
        governorate: ev.governorate ?? "",
        ticket_url: ev.ticket_url ?? "",
        booking_phone: ev.booking_phone ?? "",
        price_min: ev.price_min != null ? String(ev.price_min) : "",
        price_max: ev.price_max != null ? String(ev.price_max) : "",
        venue_name: ev.venue?.name ?? "",
        venue_area: ev.venue?.area ?? "",
        tags: ev.tags ?? [],
        media: [...(ev.media ?? [])].sort((a, b) => a.position - b.position).map((m) => ({ url: m.url, kind: m.kind })),
      };
    }
  }

  return <NewEventForm initial={initial} />;
}
