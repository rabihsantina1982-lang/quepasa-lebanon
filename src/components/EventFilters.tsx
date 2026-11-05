"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { X, Search } from "lucide-react";
import { tagLabel } from "@/lib/tags";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { categoryImage } from "@/lib/categoryImages";
import { governorateChips } from "@/lib/regions";
import type { CategoryRow } from "@/lib/supabase/types";

const datePresets = ["today", "tomorrow", "thisWeekend", "thisWeek", "comingSoon"] as const;

export function EventFilters({
  categories,
  locale,
  availableTags = [],
}: {
  categories: CategoryRow[];
  locale: string;
  // Sub-filters that have events in the selected category (in display order).
  availableTags?: string[];
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
  const activeTag = params.get("tag") ?? "";
  const urlQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep the box in sync when the URL changes (e.g. "Clear all").
  useEffect(() => setQuery(urlQuery), [urlQuery]);
  const activeGovernorate = params.get("governorate") ?? "";

  function update(next: URLSearchParams) {
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  function setCategory(slug: string) {
    const next = new URLSearchParams(params);
    activeCategory === slug ? next.delete("category") : next.set("category", slug);
    next.delete("tag"); // sub-filters belong to one category
    update(next);
  }
  function clearCategory() {
    const next = new URLSearchParams(params);
    next.delete("category");
    next.delete("tag");
    update(next);
  }
  function setTag(tag: string) {
    const next = new URLSearchParams(params);
    activeTag === tag || !tag ? next.delete("tag") : next.set("tag", tag);
    update(next);
  }
  function runSearch(value: string) {
    const next = new URLSearchParams(params);
    value.trim() ? next.set("q", value.trim()) : next.delete("q");
    update(next);
  }
  function onQueryChange(value: string) {
    setQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runSearch(value), 450);
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

  const anyActive = activeTag || urlQuery || activeCategory || activeDate || activeGovernorate;

  return (
    <div
      className={cn(
        "sticky top-16 z-20 -mx-4 px-4 py-3 bg-[var(--color-bg)] border-b border-[var(--color-border)] space-y-3 transition-[transform,opacity] duration-300",
        hidden && "-translate-y-full opacity-0 pointer-events-none"
      )}
    >
      {/* Search */}
      <form
        role="search"
        onSubmit={(e) => { e.preventDefault(); if (searchTimer.current) clearTimeout(searchTimer.current); runSearch(query); }}
        className="relative"
      >
        <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          enterKeyHint="search"
          className="w-full h-10 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] ps-9 pe-4 text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
        />
      </form>
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
      {/* Category tiles: a photo per category with its name on top. Two
          swipeable rows on phones, a wrapping grid on wider screens. */}
      <div className="grid grid-rows-2 grid-flow-col auto-cols-[112px] gap-2 overflow-x-auto pb-1 no-scrollbar sm:grid-rows-none sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-[repeat(auto-fill,minmax(132px,1fr))] sm:overflow-visible sm:pb-0">
        <CategoryTile label={t("allCategories")} active={!activeCategory} onClick={clearCategory} />
        {categories.map((c) => (
          <CategoryTile
            key={c.slug}
            label={tCat(c.slug as never)}
            image={categoryImage(c.slug)}
            active={activeCategory === c.slug}
            onClick={() => setCategory(c.slug)}
          />
        ))}
      </div>
      {/* Sub-filters for the selected category (e.g. Live Music -> Jazz) */}
      {activeCategory && availableTags.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:overflow-visible sm:pb-0">
          <button
            onClick={() => setTag("")}
            className={cn(
              "shrink-0 rounded-full px-3 h-8 text-xs border transition-colors",
              !activeTag
                ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] border-[var(--color-primary)]"
                : "bg-transparent border-[var(--color-primary)]/40 text-[var(--color-primary)]"
            )}
          >
            {t("allInCategory")}
          </button>
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTag(tag)}
              className={cn(
                "shrink-0 rounded-full px-3 h-8 text-xs border transition-colors",
                activeTag === tag
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] border-[var(--color-primary)]"
                  : "bg-transparent border-[var(--color-primary)]/40 text-[var(--color-primary)]"
              )}
            >
              {tagLabel(tag, locale)}
            </button>
          ))}
        </div>
      )}
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

function CategoryTile({ label, image, active, onClick }: { label: string; image?: string | null; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--color-primary)] outline outline-[3px] outline-offset-2 transition-transform hover:-translate-y-0.5",
        active ? "outline-[var(--color-primary)]" : "outline-transparent"
      )}
    >
      {image && (
        <>
          <Image src={image} alt="" fill sizes="(max-width: 640px) 112px, 160px" className="object-cover" />
          <span className="absolute inset-0 bg-black/40" aria-hidden />
        </>
      )}
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center px-1.5 text-center font-extrabold uppercase leading-tight tracking-wide text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.7)]",
          image ? "text-[13px] sm:text-[16px]" : "text-[17px] sm:text-[21px]"
        )}
      >
        {label}
      </span>
    </button>
  );
}
