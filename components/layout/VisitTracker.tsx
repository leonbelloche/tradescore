"use client";

import { useEffect } from "react";
import { trackVisit } from "@/app/track";

const KEY = "tradescore:visit-day";

// Counts this browser once per day (no cookie, no personal data: just today's date in localStorage).
export default function VisitTracker() {
  useEffect(() => {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    try {
      if (localStorage.getItem(KEY) === today) return;
      localStorage.setItem(KEY, today);
    } catch {
      return; // storage blocked: skip rather than count every page
    }
    if (location.pathname.startsWith("/admin")) return; // don't count yourself managing the site
    trackVisit().catch(() => {});
  }, []);
  return null;
}
