/**
 * GET /api/weekend-image?format=post|story[&governorate=beirut]
 *
 * PNG of this weekend's events for Instagram / WhatsApp: "post" is a 4:5
 * feed image (1080×1350), "story" a 9:16 story / status (1080×1920).
 * Public: it only shows published events, same as /weekend.
 */

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { buildWeekendPost, PLACE_NAME, REGION_PARAM, SITE_NAME } from "@/lib/weekendPost";
import { governorateChips } from "@/lib/regions";

export const runtime = "nodejs";

const SIZES = { post: { width: 1080, height: 1350, rows: 5 }, story: { width: 1080, height: 1920, rows: 7 } } as const;

const BG = "#fbfaf6";
const FG = "#111111";
const MUTED = "#6b6b6b";
const PRIMARY = "#0d8a8a";
const ACCENT = "#f06449";
const BORDER = "#ebe7df";
// 1080 wide minus 72 padding each side, the 200 day pill and its 28 gap.
const TEXT_WIDTH = 708;

// Keep long titles to about two lines.
function clip(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format") === "story" ? "story" : "post";
  const region = governorateChips.find((c) => c.slug === req.nextUrl.searchParams.get(REGION_PARAM));
  const tFilters = await getTranslations({ locale: "en", namespace: "Filters" });
  const regionName = region ? tFilters(region.key) : undefined;
  const post = await buildWeekendPost(region?.slug, regionName);
  const { width, height, rows } = SIZES[format];
  const items = post.items.slice(0, rows);
  const more = post.total - items.length;
  const host = new URL(post.pageUrl).host;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG, color: FG, padding: format === "story" ? "140px 72px" : "72px" }}>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: PRIMARY, letterSpacing: 1 }}>{SITE_NAME.toUpperCase()}</div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.05, marginTop: 20 }}>This weekend</div>
        <div style={{ display: "flex", fontSize: 40, color: MUTED, marginTop: 12 }}>
          {post.rangeLabel} · {regionName ?? PLACE_NAME}
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 48, flexGrow: 1 }}>
          {items.length === 0 ? (
            <div style={{ display: "flex", fontSize: 40, color: MUTED }}>New events are being added. Check back soon!</div>
          ) : (
            items.map((i, n) => (
              <div key={n} style={{ display: "flex", alignItems: "center", padding: "22px 0", borderTop: n ? `2px solid ${BORDER}` : "none" }}>
                <div style={{ display: "flex", justifyContent: "center", width: 200, flexShrink: 0, fontSize: 28, whiteSpace: "nowrap", fontWeight: 700, color: i.featured ? "#ffffff" : PRIMARY, background: i.featured ? ACCENT : "transparent", border: `3px solid ${i.featured ? ACCENT : PRIMARY}`, borderRadius: 999, padding: "6px 0" }}>
                  {i.day}
                </div>
                <div style={{ display: "flex", flexDirection: "column", marginLeft: 28, width: TEXT_WIDTH }}>
                  <div style={{ display: "flex", fontSize: 38, fontWeight: 700, lineHeight: 1.15 }}>{clip(i.title, 60)}</div>
                  {i.place && <div style={{ display: "flex", fontSize: 28, color: MUTED, marginTop: 6 }}>{clip(i.place, 50)}</div>}
                </div>
              </div>
            ))
          )}
          {more > 0 && <div style={{ display: "flex", fontSize: 32, color: MUTED, marginTop: 16 }}>+ {more} more events</div>}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: PRIMARY, color: "#ffffff", borderRadius: 28, padding: "28px 40px" }}>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 700 }}>See all {post.total} events</div>
          <div style={{ display: "flex", fontSize: 32 }}>{host}/weekend</div>
        </div>
      </div>
    ),
    {
      width,
      height,
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" },
    }
  );
}
