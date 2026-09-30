import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { createClient } from "@/lib/supabase/server";
import { SignInButton } from "./SignInButton";
import { SignOutButton } from "./SignOutButton";

export async function Header() {
  const t = await getTranslations("Common");
  const tNav = await getTranslations("Nav");

  let signedIn = false;
  let role: string | null = null;
  let firstName: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, display_name")
        .eq("id", data.user.id)
        .maybeSingle();
      const p = profile as { role: string; display_name: string | null } | null;
      role = p?.role ?? null;
      firstName = p?.display_name?.trim().split(/\s+/)[0] ?? null;
    }
  } catch {
    // Supabase env not configured yet — render anonymous.
  }

  const isPromoter = role === "promoter" || role === "admin";
  const isAdmin = role === "admin";

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 h-16 flex items-center gap-2 sm:gap-4">
        <Link href="/" className="flex items-baseline gap-2 tracking-tight">
          <span className="text-2xl sm:text-3xl font-bold" style={{ letterSpacing: "0.02em" }}>
            <span
              style={{
                color: "var(--color-primary)",
                textShadow: "0 0 6px var(--color-primary), 0 0 20px var(--color-primary), 0 0 40px var(--color-primary)",
              }}
            >Que</span>
            <span
              style={{
                color: "var(--color-fg)",
                textShadow: "0 0 6px var(--color-fg), 0 0 20px var(--color-fg)",
              }}
            >Pasa</span>
          </span>
          <span
            className="text-xs sm:text-sm font-semibold"
            style={{
              color: "var(--color-muted)",
              textShadow: "0 0 4px var(--color-muted), 0 0 12px var(--color-muted)",
              opacity: 0.85,
            }}
          >
            Lebanon
          </span>
        </Link>
        <nav className="hidden lg:flex items-center gap-1 ms-4">
          <Link href="/events" className="px-3 py-1.5 rounded-full hover:bg-[var(--color-card)] text-sm">{tNav("browse")}</Link>
          <Link href="/map" className="px-3 py-1.5 rounded-full hover:bg-[var(--color-card)] text-sm">{tNav("map")}</Link>
          <Link href="/favorites" className="px-3 py-1.5 rounded-full hover:bg-[var(--color-card)] text-sm">{tNav("favorites")}</Link>
          <Link href="/premium" className="px-3 py-1.5 rounded-full hover:bg-[var(--color-card)] text-sm">✨ {tNav("premium")}</Link>
          {isPromoter ? (
            <Link href="/promoter/new-event" className="px-3 py-1.5 rounded-full hover:bg-[var(--color-card)] text-sm">{tNav("submit")}</Link>
          ) : (
            <Link href="/become-a-promoter" className="px-3 py-1.5 rounded-full hover:bg-[var(--color-card)] text-sm">{tNav("submit")}</Link>
          )}
          {isPromoter && (
            <Link href="/promoter" className="px-3 py-1.5 rounded-full hover:bg-[var(--color-card)] text-sm text-[var(--color-primary)] font-medium">{tNav("promoter")}</Link>
          )}
          {isAdmin && (
            <Link href="/admin" className="px-3 py-1.5 rounded-full hover:bg-[var(--color-card)] text-sm text-[var(--color-accent)] font-medium">{tNav("admin")}</Link>
          )}
        </nav>
        <div className="ms-auto flex items-center gap-1.5 sm:gap-2">
          <LocaleSwitcher />
          <Link
            href={isPromoter ? "/promoter/new-event" : "/become-a-promoter"}
            className="lg:hidden inline-flex items-center h-9 px-2.5 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] text-xs font-semibold whitespace-nowrap"
          >
            {tNav("submit")}
          </Link>
          <div className="hidden lg:flex items-center gap-2">
            {signedIn ? (
              <>
                {firstName && (
                  <span className="text-sm text-[var(--color-muted)]">
                    {t("greeting", { name: firstName })}
                  </span>
                )}
                <SignOutButton label={t("signOut")} />
              </>
            ) : (
              <SignInButton label={t("signIn")} />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
