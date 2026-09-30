"use client";

import { useEffect } from "react";
import { trackEventActivity } from "@/lib/track";

// Logs one view per event per browser session. Skipped for the event's own
// promoter so their visits don't inflate their stats.
export function TrackEventView({ eventId, skip }: { eventId: string; skip?: boolean }) {
  useEffect(() => {
    if (skip) return;
    const key = `viewed:${eventId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // storage unavailable (private mode) — still count the view
    }
    trackEventActivity(eventId, "view");
  }, [eventId, skip]);

  return null;
}
