"use client";
// The same queue for every channel (X, Instagram): today's posts, each with its generated image.
// Connected channel: "Publish now" posts directly on your account. Not connected: open X / download + copy.
import { useState, useTransition } from "react";
import { publishPost } from "@/app/admin/social";
import type { Channel, SocialPost } from "@/lib/social/channels";
import type { Published } from "@/lib/social/history";

const NAME: Record<Channel, string> = { x: "𝕏", instagram: "Instagram" };

function PostCard({ post, connected, done }: { post: SocialPost; connected: boolean; done?: Published }) {
  const [text, setText] = useState(post.text);
  const [published, setPublished] = useState<Published | undefined>(done);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const length = [...text].length + (post.url ? 24 : 0);
  const tooLong = length > post.limit;
  const square = post.channel === "instagram";

  function publish(force = false) {
    start(async () => {
      const r = await publishPost({ id: post.id, channel: post.channel, text, url: post.url, image: post.image, force });
      if (r.ok) {
        setPublished({ url: r.url, at: new Date().toISOString() });
        setMessage(r.warning ? { ok: true, text: r.warning } : null);
      } else setMessage({ ok: false, text: r.message });
    });
  }
  async function downloadImage() {
    const blob = await fetch(post.image).then((r) => r.blob());
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `trade-score-${post.kind.toLowerCase().replace(/\s+/g, "-")}.${square ? "jpg" : "png"}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function copyText() {
    try {
      await navigator.clipboard.writeText(post.url ? `${text}\n${post.url}` : text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  const intent = `https://x.com/intent/post?text=${encodeURIComponent(text)}${post.url ? `&url=${encodeURIComponent(post.url)}` : ""}`;

  return (
    <li className={`grid gap-4 rounded-2xl border bg-surface p-3 sm:p-4 ${square ? "md:grid-cols-[200px_1fr]" : "md:grid-cols-[280px_1fr]"} ${published ? "border-score-5/40" : "border-border"}`}>
      <a href={post.image} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.image} alt={`Image for: ${post.kind}`} loading="lazy" className={`w-full rounded-xl border border-border bg-surface-2 object-cover ${square ? "aspect-[4/5]" : "aspect-[16/9]"}`} />
      </a>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="num rounded bg-surface-2 px-2 py-0.5 text-xs font-bold">{post.time}</span>
          <span className="display text-xs font-bold text-accent">{post.kind}</span>
          {published && <span className="num rounded bg-score-5/15 px-2 py-0.5 text-xs font-bold text-score-5">✓ Published</span>}
          <span className={`num ml-auto text-xs ${tooLong ? "text-score-1" : "text-muted"}`}>
            {length}/{post.limit}
          </span>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={square ? 7 : 5} className="w-full flex-1 resize-y rounded-lg border border-border bg-background p-2.5 text-sm leading-relaxed focus:border-accent" aria-label={`Text for ${post.time}`} />
        {post.url && <p className="truncate text-xs text-muted">🔗 {post.url}</p>}
        <div className="flex flex-wrap items-center gap-2">
          {connected ? (
            published ? (
              <>
                {published.url && (
                  <a href={published.url} target="_blank" rel="noopener noreferrer" className="display inline-flex min-h-10 items-center rounded-lg bg-score-5 px-4 text-sm font-bold text-black">
                    See the post ▸
                  </a>
                )}
                <button type="button" onClick={() => publish(true)} disabled={pending} className="display min-h-10 rounded-lg border border-border-strong px-3 text-xs font-bold text-muted hover:text-foreground">
                  Publish again
                </button>
              </>
            ) : (
              <button type="button" onClick={() => publish()} disabled={pending || tooLong} className="display inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-bold text-black hover:brightness-110 disabled:opacity-50">
                {pending ? "Publishing…" : `Publish now on ${NAME[post.channel]}`}
              </button>
            )
          ) : post.channel === "x" ? (
            <a href={tooLong ? undefined : intent} target="_blank" rel="noopener noreferrer" onClick={() => !tooLong && setPublished({ url: null, at: new Date().toISOString() })} className="display inline-flex min-h-10 items-center rounded-lg bg-foreground px-4 text-sm font-bold text-background">
              Open in 𝕏 ▸
            </a>
          ) : (
            <button type="button" onClick={copyText} className="display min-h-10 rounded-lg bg-foreground px-4 text-sm font-bold text-background">
              {copied ? "Caption copied ✓" : "Copy caption"}
            </button>
          )}
          <button type="button" onClick={downloadImage} className="display min-h-10 rounded-lg border border-border-strong px-4 text-sm font-bold hover:border-accent">
            ⬇ Image
          </button>
        </div>
        {message && <p className={`text-sm ${message.ok ? "text-score-3" : "text-score-1"}`}>{message.ok ? "⚠ " : "✕ "}{message.text}</p>}
      </div>
    </li>
  );
}

export default function ChannelQueue({ posts, connected, published }: { posts: SocialPost[]; connected: boolean; published: Record<string, Published> }) {
  const done = posts.filter((p) => published[p.id]).length;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-score-5 transition-all" style={{ width: `${posts.length ? (done / posts.length) * 100 : 0}%` }} />
        </div>
        <span className="num text-sm text-muted">
          {done}/{posts.length} published
        </span>
      </div>
      <ol className="space-y-3">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} connected={connected} done={published[p.id]} />
        ))}
      </ol>
    </div>
  );
}
