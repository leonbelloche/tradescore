import type { Metadata } from "next";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import VideoStudio from "@/components/admin/VideoStudio";
import LoadingBlock from "@/components/LoadingBlock";
import { Card } from "@/components/ui";
import { claudeConfigured } from "@/lib/admin/claude";
import { requireAdmin } from "@/lib/admin/session";
import { SITE_URL } from "@/lib/site";
import { getScoredTrades } from "@/lib/trades/scored";

export const metadata: Metadata = { title: "Video studio — Admin", robots: { index: false } };

export default function VideoStudioPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Studio />
    </Suspense>
  );
}

async function Studio() {
  await requireAdmin();
  const trades = await getScoredTrades();
  return (
    <div className="space-y-6">
      <AdminHeader title="Video studio" sub="Claude Opus 5.5 writes a 15-20 second vertical video, the site animates it in our colors, you download it and post it." />
      {!claudeConfigured() && (
        <Card className="border-score-3/40 bg-score-3/10 p-4 text-sm">
          Claude is not connected yet: add <code className="num">ANTHROPIC_API_KEY</code> to <code className="num">.env.local</code> and to Vercel (key from console.anthropic.com).
        </Card>
      )}
      <VideoStudio
        trades={trades.map((t) => ({ id: t.id, label: `${t.date} · ${t.teams.map((x) => `${x.team.short_name ?? x.team.name} ${x.score}`).join(" / ")}` }))}
        site={SITE_URL.replace(/^https?:\/\//, "")}
      />
    </div>
  );
}
