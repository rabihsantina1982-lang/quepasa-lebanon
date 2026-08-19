"use client";
import { Home, Compass, Map, Heart, User } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function BottomNav({ isPromoter }: { isPromoter: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const items = [
    { href: "/", labelKey: "home", Icon: Home },
    { href: "/events", labelKey: "browse", Icon: Compass },
    { href: "/map", labelKey: "map", Icon: Map },
    { href: "/favorites", labelKey: "favorites", Icon: Heart },
    { href: isPromoter ? "/promoter/new-event" : "/become-a-promoter", labelKey: "submit", Icon: User },
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
                className={cn(
                  "flex flex-col items-center justify-center h-16 text-[11px] gap-0.5",
                  active ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]"
                )}
              >
                <Icon size={20} aria-hidden />
                <span>{t(labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
