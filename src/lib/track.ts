// Client-side helper for /api/track. sendBeacon survives the page being left
// (e.g. clicking out to a ticket site), unlike a normal fetch.
export function trackEventActivity(eventId: string, kind: "view" | "ticket_click") {
  const locale = document.documentElement.lang || "en";
  const body = JSON.stringify({ eventId, kind, locale });
  try {
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return;
  } catch {
    // fall through to fetch
  }
  fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
}
