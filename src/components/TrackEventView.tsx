"use client";

import { useEffect } from "react";
import { trackEventActivity, detectViewSource } from "@/lib/track";

// Logs one view per event per browser session, with where the visitor came
// from. Skipped for the event's own promoter so their visits don't inflate
// their stats.
export function TrackEventView({ eventId, slug, skip }: { eventId: string; slug: string; skip?: boolean }) {
  useEffect(() => {
    if (skip) return;
    const key = `viewed:${eventId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // storage unavailable (private mode) — still count the view
    }
    trackEventActivity(eventId, "view", detectViewSource(slug));
  }, [eventId, slug, skip]);

  return null;
}
