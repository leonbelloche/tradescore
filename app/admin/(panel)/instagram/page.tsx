import type { Metadata } from "next";
import { Suspense } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import ChannelQueue from "@/components/admin/ChannelQueue";
import ConnectBox from "@/components/admin/ConnectBox";
import LoadingBlock from "@/components/LoadingBlock";
import { requireAdmin } from "@/lib/admin/session";
import { postsForToday } from "@/lib/admin/today";
import { forChannel } from "@/lib/social/channels";
import { publishedOn } from "@/lib/social/history";
import { instagramConnected } from "@/lib/social/instagram";

export const metadata: Metadata = { title: "Instagram — Admin", robots: { index: false } };

export default function InstagramPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <InstagramChannel />
    </Suspense>
  );
}

async function InstagramChannel() {
  await requireAdmin();
  const { today, posts } = await postsForToday();
  const queue = forChannel(posts, "instagram");
  const published = await publishedOn(today);
  const connected = instagramConnected();

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Instagram"
        sub={`Today's ${queue.length} posts in Instagram format (4:5 portrait image, longer caption, “link in bio”).`}
        action={<span className={`num rounded-full px-3 py-1 text-xs font-bold ${connected ? "bg-score-5/15 text-score-5" : "bg-surface-2 text-muted"}`}>{connected ? "● Connected" : "○ Not connected"}</span>}
      />
      {!connected && <ConnectBox channel="instagram" />}
      <ChannelQueue posts={queue} connected={connected} published={published} />
    </div>
  );
}
