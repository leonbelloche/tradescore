import type { Metadata } from "next";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import XPostList from "@/components/admin/XPostList";
import LoadingBlock from "@/components/LoadingBlock";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/session";
import { postsForToday } from "@/lib/admin/today";

export const metadata: Metadata = { title: "X posts — Admin", robots: { index: false } };

export default function XPostsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Posts />
    </Suspense>
  );
}

async function Posts() {
  await requireAdmin();
  const { today, posts } = await postsForToday();
  const date = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

  return (
    <div className="space-y-6">
      <AdminHeader title="Posts of the day" current="/admin/x" sub={`${date} · ${posts.length} posts ready, about one an hour (Eastern time).`} />
      <Card className="p-4 text-sm text-muted">
        Edit a post if you want, then click <b className="text-foreground">Post on 𝕏</b>: X opens with the text already written, you just press Post.
        The posts come from the site&apos;s data (graded trades, games, trade ideas, ESPN news) and change every day.
      </Card>
      {posts.length ? <XPostList posts={posts} /> : <Card className="p-6 text-center text-muted">No posts today: no data yet.</Card>}
    </div>
  );
}
