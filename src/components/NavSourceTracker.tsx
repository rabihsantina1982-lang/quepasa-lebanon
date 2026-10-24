"use client";

import { useEffect } from "react";
import { NAV_SOURCE_KEY } from "@/lib/track";

// Remembers which part of QuePasa a visitor clicked an event from (the
// homepage spotlight, a boosted card, Browse, or another page), so the event
// page can count where its views come from. Links can name their source with
// data-qp-from; otherwise it's worked out from the page the click was on.
export function NavSourceTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank") return;
      let url: URL;
      try {
        url = new URL(a.href);
      } catch {
        return;
      }
      if (url.origin !== location.origin || !/\/events\/[^/]+$/.test(url.pathname)) return;
      const source = a.dataset.qpFrom ?? (/\/events\/?$/.test(location.pathname) ? "browse" : "quepasa");
      try {
        sessionStorage.setItem(NAV_SOURCE_KEY, JSON.stringify({ path: url.pathname, source, at: Date.now() }));
      } catch {
        // storage unavailable: the view is counted without a source
      }
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
