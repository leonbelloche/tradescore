// Keeps the data fresh without any cron job: the first visit after 20 hours starts the ESPN refresh
// in the background (the visitor does not wait). Works locally and on any host.
import { after, connection } from "next/server";
import { adminDb, must } from "@/lib/db/admin";
import type { League } from "@/lib/db/types";
import { refreshData, saveSite, type SiteSettings } from "./refresh";

const STALE_MS = 20 * 3_600_000; // refresh when the data is older than this
const RUNNING_MS = 15 * 60_000; // a refresh started less than this ago is still running

export async function refreshIfStale(): Promise<void> {
  if (!process.env.SUPABASE_SECRET_KEY) return; // the refresh writes to the database
  await connection();
  try {
    const league = await must<League>("league", adminDb().from("leagues").select("rules_json").eq("id", "nba").single());
    const site = (league.rules_json.site ?? {}) as SiteSettings;
    const now = Date.now();
    if (now - Date.parse(site.lastRefresh ?? "1970-01-01") < STALE_MS) return;
    if (now - Date.parse(site.refreshStartedAt ?? "1970-01-01") < RUNNING_MS) return;
    await saveSite({ refreshStartedAt: new Date(now).toISOString() });
    after(async () => {
      try {
        await refreshData();
      } catch (e) {
        await saveSite({ lastRefreshError: { at: new Date().toISOString(), message: e instanceof Error ? e.message : String(e) } }).catch(() => {});
      }
    });
  } catch {
    // never break a page because of the refresh
  }
}

// Drop-in for a layout: renders nothing.
export default async function DailyRefresh() {
  await refreshIfStale();
  return null;
}
