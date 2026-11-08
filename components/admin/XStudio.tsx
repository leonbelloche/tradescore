"use client";
// X studio tools: write a post with Claude, or reply to someone's post with Claude.
// Claude also picks a trade card image to attach. Nothing is posted automatically:
// each button opens X with the text ready, you press Post.
import { useState, useTransition } from "react";
import { draftPosts, draftReplies, type Card, type Tweet } from "@/app/admin/studio";
import { X_LIMIT } from "@/lib/admin/xPosts";
import { field } from "./forms";

const primary = "display inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-bold text-black hover:brightness-110 disabled:opacity-50";
const xButton = "display inline-flex min-h-10 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-bold text-background hover:brightness-90";
const ghost = "display min-h-10 rounded-lg border border-border-strong px-4 text-sm font-bold hover:border-accent";

const postIntent = (text: string, url?: string) => `https://x.com/intent/post?text=${encodeURIComponent(text)}${url ? `&url=${encodeURIComponent(url)}` : ""}`;
const replyIntent = (tweetId: string, text: string) => `https://x.com/intent/post?in_reply_to=${tweetId}&text=${encodeURIComponent(text)}`;

export type TradeOption = { id: string; label: string };

// The trade card image Claude picked, with its punchline: change the trade or the line, then copy or download it.
function TradeCard({ card, trades }: { card: Card; trades: TradeOption[] }) {
  const [trade, setTrade] = useState(card?.trade ?? "");
  const [line, setLine] = useState(card?.line ?? "");
  const [shown, setShown] = useState(card?.line ?? ""); // the image reloads when you leave the field
  const [copied, setCopied] = useState(false);
  const src = trade ? `/api/cards/trade/${encodeURIComponent(trade)}?line=${encodeURIComponent(shown)}` : "";

  const blob = () => fetch(src).then((r) => r.blob());
  async function download() {
    const url = URL.createObjectURL(await blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `trade-score-${trade}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function copy() {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob() })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      await download(); // clipboard blocked: fall back to a file
    }
  }

  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="display text-sm font-bold">Image to attach</p>
        <select value={trade} onChange={(e) => setTrade(e.target.value)} className="min-h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs" aria-label="Trade on the image">
          <option value="">No image</option>
          {trades.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      {trade ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Trade card" className="aspect-[16/9] w-full rounded-lg border border-border bg-surface-2" />
          <input
            value={line}
            onChange={(e) => setLine(e.target.value)}
            onBlur={() => setShown(line)}
            onKeyDown={(e) => e.key === "Enter" && setShown(line)}
            maxLength={80}
            placeholder="Punchline on the image (optional)"
            className="mt-2 min-h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            aria-label="Punchline on the image"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={copy} className={ghost}>
              {copied ? "Copied ✓ paste it in X" : "Copy image"}
            </button>
            <button type="button" onClick={download} className={ghost}>
              ⬇ Download
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">In X: paste it with Ctrl+V in the post box, or click the image icon and pick the downloaded file.</p>
        </>
      ) : (
        <p className="text-xs text-muted">No trade fits this text. Pick one above if you want an image.</p>
      )}
    </div>
  );
}

function Draft({ initial, href, label, link }: { initial: string; href: (text: string) => string; label: string; link?: boolean }) {
  const [text, setText] = useState(initial);
  const length = [...text].length + (link ? 24 : 0);
  return (
    <li className="rounded-xl border border-border bg-background/60 p-3">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="w-full resize-y rounded-lg border border-border bg-background p-2.5 text-sm leading-relaxed focus:border-accent" aria-label="Draft" />
      <div className="mt-2 flex items-center gap-3">
        <a href={href(text)} target="_blank" rel="noopener noreferrer" className={xButton}>
          {label} ▸
        </a>
        <span className={`num ml-auto text-xs ${length > X_LIMIT ? "text-score-1" : "text-muted"}`}>
          {length}/{X_LIMIT}
        </span>
      </div>
    </li>
  );
}

export function ComposeWithClaude({ siteUrl, trades }: { siteUrl: string; trades: TradeOption[] }) {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<{ posts: string[]; card: Card; round: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await draftPosts(topic);
            if (r.ok) {
              setResult((prev) => ({ ...r.data, round: (prev?.round ?? 0) + 1 }));
              setError(null);
            } else setError(r.message);
          });
        }}
      >
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="The Jazz robbed the Lakers, Hornets-Bulls one month later…" className={field} aria-label="What should the post be about?" />
        <button type="submit" disabled={pending} className={`${primary} self-start`}>
          {pending ? "Claude is writing…" : "✦ Write with Claude"}
        </button>
      </form>
      {error && <p className="text-sm text-score-1">✕ {error}</p>}
      {result && (
        <>
          <ul className="space-y-3">
            {result.posts.map((d, i) => (
              <Draft key={`${result.round}-${i}`} initial={d} href={(t) => postIntent(t, siteUrl)} label="Post on 𝕏" link />
            ))}
          </ul>
          <TradeCard key={result.round} card={result.card} trades={trades} />
        </>
      )}
    </div>
  );
}

export function ReplyWithClaude({ trades }: { trades: TradeOption[] }) {
  const [url, setUrl] = useState("");
  const [pasted, setPasted] = useState("");
  const [angle, setAngle] = useState("");
  const [result, setResult] = useState<{ tweet: Tweet; replies: string[]; card: Card; round: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await draftReplies(url, pasted, angle);
            if (r.ok) {
              setResult((prev) => ({ ...r.data, round: (prev?.round ?? 0) + 1 }));
              setError(null);
            } else setError(r.message);
          });
        }}
      >
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://x.com/someone/status/1234567890" className={field} aria-label="Link of the post to reply to" required />
        <div className="grid gap-2 sm:grid-cols-2">
          <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={2} placeholder="(optional) paste the post's text if X can't be read" className={`${field} py-2`} aria-label="Post text" />
          <textarea value={angle} onChange={(e) => setAngle(e.target.value)} rows={2} placeholder="(optional) your angle: defend the Hornets, be funny…" className={`${field} py-2`} aria-label="Angle" />
        </div>
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Claude is reading the post…" : "✦ Draft replies with Claude"}
        </button>
      </form>
      {error && <p className="text-sm text-score-1">✕ {error}</p>}
      {result && (
        <div className="space-y-3">
          <blockquote className="rounded-xl border-l-2 border-pen bg-surface-2/60 px-4 py-3 text-sm">
            <p className="num mb-1 text-xs text-muted">{result.tweet.author || "Original post"}</p>
            <p className="whitespace-pre-line">{result.tweet.text}</p>
          </blockquote>
          <ul className="space-y-3">
            {result.replies.map((d, i) => (
              <Draft key={`${result.round}-${i}`} initial={d} href={(t) => replyIntent(result.tweet.id, t)} label="Reply on 𝕏" />
            ))}
          </ul>
          <TradeCard key={result.round} card={result.card} trades={trades} />
        </div>
      )}
    </div>
  );
}
