import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cardPaymentsEnabled, stripeTestMode } from "@/lib/stripe";
import { NewEventForm, type NewEventInitial } from "./NewEventForm";

export default async function NewEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ copy?: string; edit?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { copy, edit } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}?signin=1&next=/${locale}/promoter/new-event`);

  const { data: profileRaw } = await supabase.from("profiles").select("role, suspended_at").eq("id", user.id).single();
  const profile = profileRaw as { role: string; suspended_at: string | null } | null;
  if ((profile?.role !== "promoter" && profile?.role !== "admin") || profile?.suspended_at) {
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

  // "Edit": the whole event, dates included. Organisers edit their own events,
  // admins any event (imported ones too).
  if (edit) {
    let q = supabase
      .from("events")
      .select("id, slug, status, starts_at, ends_at, showtimes, cover_image, title_i18n, description_i18n, category_id, governorate, ticket_url, booking_phone, price_min, price_max, tags, venue:venues(name, area), media:event_media(url, kind, position)")
      .eq("id", edit);
    if (profile?.role !== "admin") q = q.eq("user_id", user.id);
    const { data: src } = await q.maybeSingle();
    if (!src) redirect(`/${locale}/promoter`);
    const ev = src as unknown as {
      id: string; slug: string; status: string; starts_at: string; ends_at: string | null;
      showtimes: { starts_at: string }[] | null; cover_image: string | null;
      title_i18n: Record<string, string>; description_i18n: Record<string, string>;
      category_id: number | null; governorate: string | null; ticket_url: string | null; booking_phone: string | null;
      price_min: number | null; price_max: number | null; tags: string[] | null;
      venue: { name: string; area: string | null } | null;
      media: { url: string; kind: "image" | "video"; position: number }[];
    };
    const media = [...(ev.media ?? [])].sort((a, b) => a.position - b.position).map((m) => ({ url: m.url, kind: m.kind }));
    const pick = (o: Record<string, string> | null) => o?.en ?? Object.values(o ?? {})[0] ?? "";
    initial = {
      title: pick(ev.title_i18n),
      description: pick(ev.description_i18n),
      category_id: ev.category_id != null ? String(ev.category_id) : "",
      governorate: ev.governorate ?? "",
      ticket_url: ev.ticket_url ?? "",
      booking_phone: ev.booking_phone ?? "",
      price_min: ev.price_min != null ? String(ev.price_min) : "",
      price_max: ev.price_max != null ? String(ev.price_max) : "",
      venue_name: ev.venue?.name ?? "",
      venue_area: ev.venue?.area ?? "",
      tags: ev.tags ?? [],
      // Imported events often have only a cover picture, no media rows.
      media: media.length ? media : ev.cover_image ? [{ url: ev.cover_image, kind: "image" as const }] : [],
      edit: {
        id: ev.id, slug: ev.slug, status: ev.status, byAdmin: profile?.role === "admin",
        starts_at: ev.starts_at, ends_at: ev.ends_at,
        dates: (ev.showtimes ?? []).map((s) => s.starts_at),
      },
    };
  }

  // The "Paste from Instagram" box only appears once the AI key is configured.
  return (
    <NewEventForm
      initial={initial}
      autofillEnabled={!!process.env.ANTHROPIC_API_KEY}
      cardPayments={cardPaymentsEnabled()}
      testMode={stripeTestMode()}
    />
  );
}
