"use client";
// X: one post at a time. Three counters (left today, late, left this week), the next post in a big card
// with its image, then: Copy image → Send to X (publishes directly when X is connected).
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { markSent, publishPost } from "@/app/admin/social";
import type { SocialPost } from "@/lib/social/channels";

const KEY = "tradescore:x-sent";
const EVENT = "tradescore:x-sent-changed";
const readRaw = () => {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
};
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};
const LAST_KEY = "tradescore:x-last-sent";
function rememberSent(id: string) {
  const ids = new Set<string>(JSON.parse(readRaw()));
  ids.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...ids].slice(-300)));
    localStorage.setItem(LAST_KEY, new Date().toISOString());
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}
const readLast = () => {
  try {
    return localStorage.getItem(LAST_KEY) ?? "";
  } catch {
    return "";
  }
};

// Minutes left before the next post is allowed (anti-spam spacing), re-checked every 20 s.
function useCooldown(serverLast: string | null, gapMinutes: number): number {
  const localLast = useSyncExternalStore(subscribe, readLast, () => "");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(t);
  }, []);
  const last = Math.max(serverLast ? Date.parse(serverLast) : 0, localLast ? Date.parse(localLast) : 0);
  return last ? Math.max(0, Math.ceil(gapMinutes - (now - last) / 60_000)) : 0;
}

// Copies an image to the clipboard (PNG), so you can paste it in the X composer with Ctrl+V.
export async function copyImage(url: string) {
  const png = fetch(url).then(async (r) => {
    const blob = await r.blob();
    if (blob.type === "image/png") return blob;
    const bmp = await createImageBitmap(blob); // the clipboard only takes PNG: convert
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    c.getContext("2d")!.drawImage(bmp, 0, 0);
    return c.convertToBlob({ type: "image/png" });
  });
  await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
}

function Counter({ label, value, tone }: { label: string; value: number; tone?: "late" | "done" }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === "late" && value > 0 ? "border-score-1/50 bg-score-1/10" : "border-border bg-surface"}`}>
      <p className="display text-xs font-bold text-muted">{label}</p>
      <p className={`display mt-1 text-4xl font-extrabold tabular-nums ${tone === "late" && value > 0 ? "text-score-1" : tone === "done" ? "text-score-5" : ""}`}>{value}</p>
    </div>
  );
}

export default function XQueue({ posts, publishedIds, connected, nowHour, perDay, daysLeftAfterToday, lastSentAt, gapMinutes }: { posts: SocialPost[]; publishedIds: string[]; connected: boolean; nowHour: number; perDay: number; daysLeftAfterToday: number; lastSentAt: string | null; gapMinutes: number }) {
  const wait = useCooldown(lastSentAt, gapMinutes);
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  const sent = new Set<string>([...publishedIds, ...JSON.parse(raw)]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const left = posts.filter((p) => !sent.has(p.id));
  const late = left.filter((p) => p.hour < nowHour);
  const queue = [...late, ...left.filter((p) => p.hour >= nowHour)].filter((p) => !skipped.includes(p.id));
  const current = queue[0] ?? left[0];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Counter label="Left today" value={left.length} tone={left.length === 0 ? "done" : undefined} />
        <Counter label="Late" value={late.length} tone="late" />
        <Counter label="Left this week" value={left.length + perDay * daysLeftAfterToday} />
      </div>
      {current ? (
        <PostCard
          key={current.id}
          post={current}
          late={current.hour < nowHour}
          connected={connected}
          wait={wait}
          onDone={() => rememberSent(current.id)}
          onSkip={() => setSkipped((s) => [...s, current.id])}
        />
      ) : (
        <div className="rounded-2xl border border-score-5/40 bg-score-5/10 p-8 text-center">
          <p className="display text-2xl font-extrabold">All done for today ✓</p>
          <p className="mt-1 text-sm text-muted">New posts tomorrow morning.</p>
        </div>
      )}
    </div>
  );
}

function PostCard({ post, late, connected, wait, onDone, onSkip }: { post: SocialPost; late: boolean; connected: boolean; wait: number; onDone: () => void; onSkip: () => void }) {
  const [text, setText] = useState(post.text);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const length = [...text].length + (post.url ? 24 : 0);
  const tooLong = length > post.limit;

  async function copy() {
    try {
      await copyImage(post.image);
      setCopied(true);
    } catch {
      setError("Your browser blocked the copy: right-click the image → Copy image.");
    }
  }

  function send() {
    setError(null);
    if (wait > 0) return;
    if (connected) {
      start(async () => {
        const r = await publishPost({ id: post.id, channel: "x", text, url: post.url, image: post.image });
        if (r.ok) onDone();
        else setError(r.message);
      });
      return;
    }
    // Not connected: open X with the text (paste the copied image there), then count it as sent.
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}${post.url ? `&url=${encodeURIComponent(post.url)}` : ""}`, "_blank", "noopener");
    start(async () => {
      await markSent({ id: post.id, channel: "x", text, image: post.image });
      onDone();
    });
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-border-strong bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <span className={`num rounded px-2 py-0.5 text-xs font-bold ${late ? "bg-score-1/15 text-score-1" : "bg-surface-2"}`}>{late ? `Late · ${post.time}` : post.time}</span>
        <span className="display text-xs font-bold text-accent">{post.kind}</span>
        <span className={`num ml-auto text-xs ${tooLong ? "text-score-1" : "text-muted"}`}>
          {length}/{post.limit}
        </span>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-[1.4fr_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.image} alt={`Image for: ${post.kind}`} className="aspect-[16/9] w-full rounded-2xl border border-border bg-surface-2 object-cover" />
        <div className="flex flex-col gap-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className="w-full flex-1 resize-y rounded-xl border border-border bg-background p-3 text-sm leading-relaxed focus:border-accent" aria-label="Post text" />
          {post.url && <p className="truncate text-xs text-muted">🔗 {post.url}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={copy} className={`display min-h-12 rounded-xl border-2 px-4 text-sm font-bold ${copied ? "border-score-5 text-score-5" : "border-border-strong hover:border-accent"}`}>
              {copied ? "Image copied ✓" : "1. Copy image"}
            </button>
            <button type="button" onClick={send} disabled={pending || tooLong || wait > 0} className="display min-h-12 rounded-xl bg-foreground px-4 text-sm font-bold text-background hover:brightness-90 disabled:opacity-50">
              {pending ? "Sending…" : wait > 0 ? `Wait ${wait} min` : connected ? "2. Send to 𝕏" : "2. Send to 𝕏 ▸"}
            </button>
          </div>
          <p className="text-xs text-muted">{connected ? "Send to 𝕏 publishes the text and the image directly on your account." : "X opens with the text: paste the image with Ctrl+V, press Post. The next post shows up here."}</p>
          {wait > 0 && (
            <p className="rounded-lg bg-score-3/10 px-3 py-2 text-xs text-score-3">
              Anti-spam pause: X bans accounts that post in bursts, so posts are spaced at least 45 minutes apart. Next one in {wait} min. You can already copy the image.
            </p>
          )}
          {error && <p className="text-sm text-score-1">✕ {error}</p>}
          <button type="button" onClick={onSkip} className="self-start text-xs text-muted underline-offset-2 hover:text-foreground hover:underline">
            Skip this one for now
          </button>
        </div>
      </div>
    </article>
  );
}
