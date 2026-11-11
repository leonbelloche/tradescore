import type { Metadata } from "next";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import ConnectBox from "@/components/admin/ConnectBox";
import ReelStudio from "@/components/admin/ReelStudio";
import LoadingBlock from "@/components/LoadingBlock";
import { claudeConfigured } from "@/lib/admin/claude";
import { requireAdmin } from "@/lib/admin/session";
import { todayEastern } from "@/lib/admin/today";
import { SITE_URL } from "@/lib/site";
import { countSince, publishedOn } from "@/lib/social/history";
import { instagramConnected } from "@/lib/social/instagram";
import { REEL_FORMATS, formatForWeek, weekOf, weeklyReel } from "@/lib/social/reels";
import { getScoredTrades } from "@/lib/trades/scored";

export const metadata: Metadata = { title: "Instagram — Admin", robots: { index: false } };
export const maxDuration = 300; // publishing a Reel waits for Instagram to process the video

export default function InstagramPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Instagram />
    </Suspense>
  );
}

async function Instagram() {
  await requireAdmin();
  const today = await todayEastern();
  const week = weekOf(today);
  const format = formatForWeek(week.key);
  const reelId = `instagram:reel-${week.key}`;
  const [trades, publishedWeek, reelsThisMonth] = await Promise.all([getScoredTrades(), weekPublished(week.monday, reelId), countSince("instagram", `${today.slice(0, 8)}01`)]);
  const connected = instagramConnected();

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Instagram"
        sub="Un Reel par semaine. Génère la vidéo, envoie-la sur Instagram, c'est fini jusqu'à la semaine prochaine."
        action={<span className={`num rounded-full px-3 py-1 text-xs font-bold ${connected ? "bg-score-5/15 text-score-5" : "bg-surface-2 text-muted"}`}>{connected ? "● Connecté" : "○ Pas connecté"}</span>}
      />
      <ReelStudio
        weekKey={week.key}
        reelId={reelId}
        script={weeklyReel(format, trades)}
        formatLabel={REEL_FORMATS.find((f) => f.id === format)!.label}
        done={publishedWeek}
        connected={connected}
        claude={claudeConfigured()}
        site={SITE_URL.replace(/^https?:\/\//, "")}
        daysLeft={week.daysLeft}
        reelsThisMonth={reelsThisMonth}
      />
      {!connected && <ConnectBox channel="instagram" />}
    </div>
  );
}

// Was this week's Reel already sent? (looks at every day since Monday)
async function weekPublished(monday: string, reelId: string): Promise<{ url: string | null } | null> {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${monday}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const maps = await Promise.all(days.map((d) => publishedOn(d)));
  const hit = maps.find((m) => m[reelId]);
  return hit ? { url: hit[reelId].url } : null;
}
