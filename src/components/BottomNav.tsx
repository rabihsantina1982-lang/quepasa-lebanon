"use client";
import { useEffect, useRef, useState } from "react";
import { Home, Compass, Map, Heart, User, LayoutDashboard, Shield, Sparkles, LogOut } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { SignInDialog } from "./SignInDialog";

const itemCls = "flex w-full flex-col items-center justify-center h-16 text-[11px] gap-0.5";

export function BottomNav({
  isPromoter,
  isAdmin,
  signedIn,
  firstName,
}: {
  isPromoter: boolean;
  isAdmin: boolean;
  signedIn: boolean;
  firstName: string | null;
}) {
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const tCommon = useTranslations("Common");
  const items = [
    { href: "/", labelKey: "home", Icon: Home },
    { href: "/events", labelKey: "browse", Icon: Compass },
    { href: "/map", labelKey: "map", Icon: Map },
    { href: "/favorites", labelKey: "favorites", Icon: Heart },
  ] as const;
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur">
      <ul className="grid grid-cols-5">
        {items.map(({ href, labelKey, Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(itemCls, active ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]")}
              >
                <Icon size={20} aria-hidden />
                <span>{t(labelKey)}</span>
              </Link>
            </li>
          );
        })}
        <li>
          {signedIn ? (
            <AccountMenu isPromoter={isPromoter} isAdmin={isAdmin} firstName={firstName} />
          ) : (
            <SignInItem label={tCommon("signIn")} />
          )}
        </li>
      </ul>
    </nav>
  );
}

// Signed out: the last slot opens the sign-in dialog (the top bar's button is
// "Submit your event" on phones).
function SignInItem({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn(itemCls, "text-[var(--color-muted)]")}>
        <User size={20} aria-hidden />
        <span>{label}</span>
      </button>
      <SignInDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

// Signed in: the last slot opens a small menu with the links the desktop header
// shows (dashboard, admin, premium) plus sign out — none were reachable on
// phones before.
function AccountMenu({ isPromoter, isAdmin, firstName }: { isPromoter: boolean; isAdmin: boolean; firstName: string | null }) {
  const t = useTranslations("Nav");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  async function signOut() {
    await createClient().auth.signOut();
    setOpen(false);
    router.refresh();
  }

  const linkCls = "flex items-center gap-2 px-4 py-3 text-sm hover:bg-[var(--color-bg)]";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(itemCls, open ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]")}
      >
        <User size={20} aria-hidden />
        <span>{tCommon("account")}</span>
      </button>
      {open && (
        <div className="absolute bottom-full end-1 mb-2 w-56 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg">
          {firstName && (
            <div className="px-4 py-3 text-sm text-[var(--color-muted)] border-b border-[var(--color-border)]">
              {tCommon("greeting", { name: firstName })}
            </div>
          )}
          {isPromoter && (
            <Link href="/promoter" className={cn(linkCls, "text-[var(--color-primary)] font-medium")}>
              <LayoutDashboard size={16} aria-hidden /> {t("promoter")}
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" className={cn(linkCls, "text-[var(--color-accent)] font-medium")}>
              <Shield size={16} aria-hidden /> {t("admin")}
            </Link>
          )}
          <Link href="/premium" className={linkCls}>
            <Sparkles size={16} aria-hidden /> {t("premium")}
          </Link>
          <button type="button" onClick={signOut} className={cn(linkCls, "w-full border-t border-[var(--color-border)]")}>
            <LogOut size={16} aria-hidden /> {tCommon("signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
