"use client";
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
    <div className="sticky top-14 z-20 -mx-4 px-4 py-3 bg-[var(--color-bg)]/95 backdrop-blur border-b border-[var(--color-border)] space-y-3">
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
      {/* Category row — single select, wraps into two rows */}
      <div className="flex flex-wrap gap-2">
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
      <div className="flex flex-wrap gap-2 items-center">
        {datePresets.map((p) => (
          <button
            key={p}
            onClick={() => setDate(p)}
            className={cn(
              "rounded-full px-3 h-8 text-xs border",
              activeDate === p
                ? "bg-[var(--color-fg)] text-[var(--color-bg)] border-[var(--color-fg)]"
                : "bg-transparent border-[var(--color-border)]"
            )}
          >
            {t(p)}
          </button>
        ))}
        {anyActive && (
          <button onClick={clearAll} className="ms-auto inline-flex items-center gap-1 text-xs text-[var(--color-muted)]">
            <X size={12} /> {tCommon("clearAll")}
          </button>
        )}
      </div>
    </div>
  );
}
