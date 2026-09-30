import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { fetchEvents } from "@/lib/queries";
import { EventCard } from "@/components/EventCard";
import { Building2, Phone, MessageCircle, Mail, AtSign, Globe } from "lucide-react";
import Image from "next/image";
import { ProfileTypeTag } from "@/components/ProfileTypeTag";
import { SignInButton } from "@/components/SignInButton";
import { isProfileType } from "@/lib/profileTypes";

type Contacts = {
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  website: string | null;
};

// Turn what promoters type into working links.
function contactLinks(c: Contacts) {
  const digits = (v: string) => v.replace(/[^\d+]/g, "");
  const insta = c.instagram?.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
  const site = c.website?.trim();
  return [
    c.phone && { key: "phone", Icon: Phone, href: `tel:${digits(c.phone)}`, text: c.phone },
    c.whatsapp && { key: "whatsapp", Icon: MessageCircle, href: `https://wa.me/${digits(c.whatsapp).replace(/^\+/, "")}`, text: c.whatsapp },
    c.email && { key: "email", Icon: Mail, href: `mailto:${c.email.trim()}`, text: c.email.trim() },
    insta && { key: "instagram", Icon: AtSign, href: `https://instagram.com/${insta}`, text: `@${insta}` },
    site && { key: "website", Icon: Globe, href: /^https?:\/\//.test(site) ? site : `https://${site}`, text: site.replace(/^https?:\/\//, "") },
  ].filter(Boolean) as { key: string; Icon: typeof Phone; href: string; text: string }[];
}

export default async function PromoterProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: promoter } = await supabase
    .from("profiles")
    .select("business_name, logo_url, display_name, avatar_url, role, profile_type, bio")
    .eq("id", id)
    .maybeSingle();

  // Only listed profiles are public: promoters, plus admins who opted in by
  // choosing a directory type (profiles_public_promoter_read, 0015).
  if (!promoter || !(promoter.role === "promoter" || (promoter.role === "admin" && promoter.profile_type))) notFound();

  const name = promoter.business_name ?? promoter.display_name ?? "Organizer";
  const logo = promoter.logo_url ?? promoter.avatar_url ?? null;

  const events = await fetchEvents({ promoterId: id, limit: 50 });

  let userId: string | null = null;
  const savedIds = new Set<string>();
  try {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
    if (userId && events.length > 0) {
      const { data: favs } = await supabase
        .from("favorites")
        .select("event_id")
        .eq("user_id", userId)
        .in("event_id", events.map((e) => e.id));
      favs?.forEach((f) => savedIds.add(f.event_id));
    }
  } catch {
    // ignore — guests just see unsaved state
  }

  const t = await getTranslations("PromoterProfile");
  const tc = await getTranslations("Connect");

  // Contact details are readable by signed-in users only (RLS on
  // profile_contacts); guests get a sign-in prompt instead.
  let links: ReturnType<typeof contactLinks> = [];
  if (userId) {
    const { data: contacts } = await supabase
      .from("profile_contacts")
      .select("phone, whatsapp, email, instagram, website")
      .eq("user_id", id)
      .maybeSingle();
    if (contacts) links = contactLinks(contacts as Contacts);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <span className="relative w-20 h-20 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)] shrink-0 flex items-center justify-center">
          {logo ? (
            <Image src={logo} alt="" fill className="object-cover" />
          ) : (
            <Building2 size={32} className="text-[var(--color-muted)]" aria-hidden />
          )}
        </span>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{name}</h1>
          {isProfileType(promoter.profile_type) && (
            <ProfileTypeTag type={promoter.profile_type} label={tc(`types.${promoter.profile_type}`)} />
          )}
          <p className="text-sm text-[var(--color-muted)]">{t("eventsCount", { count: events.length })}</p>
        </div>
      </div>

      {promoter.bio && <p className="whitespace-pre-line text-[var(--color-fg)]/90 max-w-2xl">{promoter.bio}</p>}

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 max-w-2xl">
        <h2 className="font-semibold mb-3">{tc("contact")}</h2>
        {!userId ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-[var(--color-muted)]">{tc("signInForContacts")}</p>
            <SignInButton label={tc("signInButton")} />
          </div>
        ) : links.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">{tc("noContacts")}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {links.map(({ key, Icon, href, text }) => (
              <li key={key}>
                <a
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="flex items-center gap-2 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm hover:border-[var(--color-primary)] transition-colors"
                >
                  <Icon size={16} className="shrink-0 text-[var(--color-primary)]" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-[11px] text-[var(--color-muted)]">{tc(`contactLabels.${key}`)}</span>
                    <span className="block truncate">{text}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {events.length === 0 ? (
        <p className="text-[var(--color-muted)]">{t("noEvents")}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((ev) => (
            <EventCard key={ev.id} event={ev} locale={locale} initialSaved={savedIds.has(ev.id)} isSignedIn={!!userId} />
          ))}
        </div>
      )}
    </div>
  );
}
