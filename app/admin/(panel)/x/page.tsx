import type { Metadata } from "next";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import ChannelQueue from "@/components/admin/ChannelQueue";
import ConnectBox from "@/components/admin/ConnectBox";
import { ComposeWithClaude, ReplyWithClaude } from "@/components/admin/XStudio";
import LoadingBlock from "@/components/LoadingBlock";
import { requireAdmin } from "@/lib/admin/session";
import { postsForToday } from "@/lib/admin/today";
import { SITE_URL } from "@/lib/site";
import { forChannel } from "@/lib/social/channels";
import { publishedOn } from "@/lib/social/history";
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

function Panel({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <h2 className="display text-lg font-bold">{title}</h2>
      <p className="mb-4 text-sm text-muted">{sub}</p>
      {children}
    </section>
  );
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
        sub={`Today's ${queue.length} posts, each with its image. ${connected ? "Connected: one click publishes on your account." : ""}`}
        action={<span className={`num rounded-full px-3 py-1 text-xs font-bold ${connected ? "bg-score-5/15 text-score-5" : "bg-surface-2 text-muted"}`}>{connected ? "● Connected" : "○ Not connected"}</span>}
      />
      {!connected && <ConnectBox channel="x" />}
      <ChannelQueue posts={queue} connected={connected} published={published} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="✦ Write a post with Claude" sub="Say what it's about: Claude writes 3 versions with our real numbers and picks the image.">
          <ComposeWithClaude siteUrl={SITE_URL} trades={tradeOptions} />
        </Panel>
        <Panel title="↩ Reply to a post" sub="Paste the link of any post. Claude reads it, drafts 3 replies and picks the image.">
          <ReplyWithClaude trades={tradeOptions} />
        </Panel>
      </div>
    </div>
  );
}
