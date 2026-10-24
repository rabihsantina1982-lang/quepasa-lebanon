// Client-side helper for /api/track. sendBeacon survives the page being left
// (e.g. clicking out to a ticket site), unlike a normal fetch.
export function trackEventActivity(eventId: string, kind: "view" | "ticket_click", source?: string) {
  const locale = document.documentElement.lang || "en";
  const body = JSON.stringify({ eventId, kind, locale, source });
  try {
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return;
  } catch {
    // fall through to fetch
  }
  fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
}

// Where a view came from. Values are stored in event_activity.source and
// labelled on the promoter dashboard (src/lib/trafficLabels.ts).
export const VIEW_SOURCES = [
  "browse", "boost", "spotlight", "quepasa", "whatsapp", "shared_link",
  "google", "instagram", "facebook", "other_site", "direct",
] as const;
export type ViewSource = (typeof VIEW_SOURCES)[number];

// Set by NavSourceTracker when a visitor clicks through to an event inside
// QuePasa; read once by the event page.
export const NAV_SOURCE_KEY = "qp_from";

// `slug` is the event being viewed. It's matched against the clicked link
// rather than location.pathname, which may not have updated yet when the page
// mounts after an in-app navigation.
export function detectViewSource(slug: string): ViewSource {
  try {
    const raw = sessionStorage.getItem(NAV_SOURCE_KEY);
    if (raw) {
      sessionStorage.removeItem(NAV_SOURCE_KEY);
      const s = JSON.parse(raw) as { path: string; source: ViewSource; at: number };
      if (Date.now() - s.at < 30000 && s.path.endsWith(`/events/${slug}`) && VIEW_SOURCES.includes(s.source)) return s.source;
    }
  } catch {
    // storage unavailable: fall back to the link and referrer
  }
  const params = new URLSearchParams(location.search);
  const via = params.get("via");
  if (via === "whatsapp") return "whatsapp";
  if (via === "link") return "shared_link";
  let ref = "";
  try {
    ref = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : "";
  } catch {
    ref = "";
  }
  if (ref && ref === location.hostname) return "quepasa";
  const from = (params.get("utm_source") || ref).toLowerCase();
  if (!from) return "direct";
  if (from.includes("google")) return "google";
  if (from.includes("instagram")) return "instagram";
  if (from.includes("facebook") || from === "fb" || from.endsWith("fb.com") || from.endsWith("fb.me")) return "facebook";
  if (from.includes("whatsapp") || from === "wa.me") return "whatsapp";
  return "other_site";
}
