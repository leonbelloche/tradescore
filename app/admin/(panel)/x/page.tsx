import type { Metadata } from "next";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { ComposeWithClaude, ReplyWithClaude } from "@/components/admin/XStudio";
import XPostList from "@/components/admin/XPostList";
import LoadingBlock from "@/components/LoadingBlock";
import { Card } from "@/components/ui";
import { claudeConfigured } from "@/lib/admin/claude";
import { requireAdmin } from "@/lib/admin/session";
import { postsForToday } from "@/lib/admin/today";
import { SITE_URL } from "@/lib/site";
import { getScoredTrades } from "@/lib/trades/scored";

export const metadata: Metadata = { title: "X studio — Admin", robots: { index: false } };

export default function XStudioPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Studio />
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

async function Studio() {
  await requireAdmin();
  const [{ today, posts }, trades] = await Promise.all([postsForToday(), getScoredTrades()]);
  const tradeOptions = trades.map((t) => ({ id: t.id, label: `${t.date} · ${t.teams.map((x) => `${x.team.short_name ?? x.team.name} ${x.score}`).join(" / ")}` }));
  const date = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

  return (
    <div className="space-y-6">
      <AdminHeader title="X studio" sub="Write posts and replies with Claude Opus 5.5. Every button opens X with the text ready: you press Post." />

      {!claudeConfigured() && (
        <Card className="border-score-3/40 bg-score-3/10 p-4 text-sm">
          Claude is not connected yet: add <code className="num">ANTHROPIC_API_KEY</code> to <code className="num">.env.local</code> and to Vercel (key from console.anthropic.com). The
          posts of the day below work without it.
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="✦ Write a post" sub="Say what it's about: Claude writes 3 versions with our real numbers and picks the trade card image to attach.">
          <ComposeWithClaude siteUrl={SITE_URL} trades={tradeOptions} />
        </Panel>
        <Panel title="↩ Reply to a post" sub="Paste the link of any post (a fan, a journalist, a comment). Claude reads it, drafts 3 replies and picks the trade card image.">
          <ReplyWithClaude trades={tradeOptions} />
        </Panel>
      </div>

      <Panel title="Posts of the day" sub={`${date} · ${posts.length} ready-made posts from the site's data, about one an hour (Eastern time). Free, no Claude needed.`}>
        {posts.length ? <XPostList posts={posts} /> : <p className="text-sm text-muted">No posts today: no data yet.</p>}
      </Panel>
    </div>
  );
}
