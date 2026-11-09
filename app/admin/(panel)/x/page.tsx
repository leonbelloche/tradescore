import type { Metadata } from "next";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import ConnectBox from "@/components/admin/ConnectBox";
import XQueue from "@/components/admin/XQueue";
import { ComposeWithClaude, ReplyWithClaude } from "@/components/admin/XStudio";
import LoadingBlock from "@/components/LoadingBlock";
import { claudeConfigured } from "@/lib/admin/claude";
import { requireAdmin } from "@/lib/admin/session";
import { postsForToday } from "@/lib/admin/today";
import { POSTS_PER_DAY } from "@/lib/admin/xPosts";
import { SITE_URL } from "@/lib/site";
import { forChannel } from "@/lib/social/channels";
import { publishedOn } from "@/lib/social/history";
import { weekOf } from "@/lib/social/reels";
import { xConnected } from "@/lib/social/x";
import { getScoredTrades } from "@/lib/trades/scored";

export const metadata: Metadata = { title: "X — Admin", robots: { index: false } };

export default function XPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <XChannel />
    </Suspense>
  );
}

// Current hour in New York (0-23), read at request time (after the session check).
function easternHour(): number {
  return Number(new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }));
}

async function XChannel() {
  await requireAdmin();
  const [{ today, posts }, trades] = await Promise.all([postsForToday(), getScoredTrades()]);
  const queue = forChannel(posts, "x");
  const published = await publishedOn(today);
  const connected = xConnected();
  const tradeOptions = trades.map((t) => ({ id: t.id, label: `${t.date} · ${t.teams.map((x) => `${x.team.short_name ?? x.team.name} ${x.score}`).join(" / ")}` }));

  return (
    <div className="space-y-6">
      <AdminHeader
        title="𝕏"
        sub="One post at a time: copy the image, send to X, the next one shows up."
        action={<span className={`num rounded-full px-3 py-1 text-xs font-bold ${connected ? "bg-score-5/15 text-score-5" : "bg-surface-2 text-muted"}`}>{connected ? "● Connected" : "○ Not connected"}</span>}
      />
      <XQueue posts={queue} publishedIds={Object.keys(published)} connected={connected} nowHour={easternHour()} perDay={POSTS_PER_DAY} daysLeftAfterToday={weekOf(today).daysLeft} />
      {!connected && <ConnectBox channel="x" />}

      <details className="rounded-2xl border border-border bg-surface p-4">
        <summary className="cursor-pointer text-sm font-bold">✦ Write a post or reply to someone with Claude {claudeConfigured() ? "" : "(needs ANTHROPIC_API_KEY)"}</summary>
        <div className="mt-4 grid gap-6 xl:grid-cols-2">
          <ComposeWithClaude siteUrl={SITE_URL} trades={tradeOptions} />
          <ReplyWithClaude trades={tradeOptions} />
        </div>
      </details>
    </div>
  );
}
