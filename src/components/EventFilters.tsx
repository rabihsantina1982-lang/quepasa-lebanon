"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryRow } from "@/lib/supabase/types";

const datePresets = ["today", "tomorrow", "thisWeekend", "thisWeek"] as const;

const governorateChips = [
  { slug: "beirut", key: "governorateBeirut" },
  { slug: "mount_lebanon", key: "governorateMountLebanon" },
  { slug: "north_lebanon", key: "governorateNorthLebanon" },
  { slug: "south_lebanon", key: "governorateSouthLebanon" },
  { slug: "bekaa", key: "governorateBekaa" },
  { slug: "nabatieh", key: "governorateNabatieh" },
  { slug: "akkar", key: "governorateAkkar" },
  { slug: "baalbek_hermel", key: "governorateBaalbekHermel" },
] as const;

export function EventFilters({
  categories,
  locale,
}: {
  categories: CategoryRow[];
  locale: string;
}) {
  const t = useTranslations("Filters");
  const tCat = useTranslations("Categories");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const hidden = useHideOnScrollDown();

  const activeCategory = params.get("category") ?? "";
  const activeDate = params.get("when") ?? "";
  const activeGovernorate = params.get("governorate") ?? "";

  function update(next: URLSearchParams) {
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  function setCategory(slug: string) {
    const next = new URLSearchParams(params);
    activeCategory === slug ? next.delete("category") : next.set("category", slug);
    update(next);
  }
  function setDate(preset: string) {
    const next = new URLSearchParams(params);
    activeDate === preset ? next.delete("when") : next.set("when", preset);
    update(next);
  }
  function setGovernorate(slug: string) {
    const next = new URLSearchParams(params);
    activeGovernorate === slug ? next.delete("governorate") : next.set("governorate", slug);
    update(next);
  }
  function clearAll() {
    update(new URLSearchParams());
  }

  const anyActive = activeCategory || activeDate || activeGovernorate;

  return (
    <div
      className={cn(
        "sticky top-14 z-20 -mx-4 px-4 py-3 bg-[var(--color-bg)]/95 backdrop-blur border-b border-[var(--color-border)] space-y-3 transition-[transform,opacity] duration-300",
        hidden && "-translate-y-full opacity-0 pointer-events-none"
      )}
    >
      {/* Governorate row */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => { const next = new URLSearchParams(params); next.delete("governorate"); update(next); }}
          className={cn(
            "shrink-0 rounded-full px-3 h-8 text-xs border transition-colors",
            !activeGovernorate
              ? "bg-[var(--color-fg)] text-[var(--color-bg)] border-[var(--color-fg)]"
              : "bg-transparent border-[var(--color-border)]"
          )}
        >
          {t("allLebanon")}
        </button>
        {governorateChips.map(({ slug, key }) => (
          <button
            key={slug}
            onClick={() => setGovernorate(slug)}
            className={cn(
              "shrink-0 rounded-full px-3 h-8 text-xs border transition-colors",
              activeGovernorate === slug
                ? "bg-[var(--color-fg)] text-[var(--color-bg)] border-[var(--color-fg)]"
                : "bg-transparent border-[var(--color-border)]"
            )}
          >
            {t(key as never)}
          </button>
        ))}
      </div>
      {/* Category row — single select. Two swipeable rows on phones (fully
          wrapping took up half the screen), wraps freely on wider screens. */}
      <div className="grid grid-rows-2 grid-flow-col auto-cols-max gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex sm:flex-wrap sm:overflow-visible sm:pb-0">
        {categories.map((c) => {
          const active = activeCategory === c.slug;
          return (
            <button
              key={c.slug}
              onClick={() => setCategory(c.slug)}
              className={cn(
                "shrink-0 rounded-full px-3 h-9 text-sm border transition-colors",
                active
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] border-[var(--color-primary)]"
                  : "bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-fg)]/30"
              )}
            >
              <span className="me-1" aria-hidden>{c.icon}</span>
              {tCat(c.slug as never)}
            </button>
          );
        })}
      </div>
      {/* Date + clear row */}
      <div className="flex gap-2 items-center overflow-x-auto no-scrollbar sm:flex-wrap sm:overflow-visible">
        {datePresets.map((p) => (
          <button
            key={p}
            onClick={() => setDate(p)}
            className={cn(
              "shrink-0 rounded-full px-3 h-8 text-xs border",
              activeDate === p
                ? "bg-[var(--color-fg)] text-[var(--color-bg)] border-[var(--color-fg)]"
                : "bg-transparent border-[var(--color-border)]"
            )}
          >
            {t(p)}
          </button>
        ))}
        {anyActive && (
          <button onClick={clearAll} className="shrink-0 ms-auto inline-flex items-center gap-1 text-xs text-[var(--color-muted)]">
            <X size={12} /> {tCommon("clearAll")}
          </button>
        )}
      </div>
    </div>
  );
}

// Slides the sticky filter bar away while scrolling down through results, and
// brings it back on any meaningful scroll up (or near the top of the page), so
// the bar doesn't eat most of a phone screen while browsing.
function useHideOnScrollDown() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      const delta = y - lastY.current;
      if (y < 120) setHidden(false);
      else if (delta > 8) setHidden(true);
      else if (delta < -8) setHidden(false);
      else return;
      lastY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return hidden;
}
