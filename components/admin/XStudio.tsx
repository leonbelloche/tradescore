"use client";
// X studio tools: write a post with Claude, or reply to someone's post with Claude.
// Nothing is posted automatically: each button opens X with the text ready, you press Post.
import { useState, useTransition } from "react";
import { draftPosts, draftReplies, type Tweet } from "@/app/admin/studio";
import { X_LIMIT } from "@/lib/admin/xPosts";
import { field } from "./forms";

const primary = "display inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-bold text-black hover:brightness-110 disabled:opacity-50";
const xButton = "display inline-flex min-h-10 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-bold text-background hover:brightness-90";

const postIntent = (text: string, url?: string) => `https://x.com/intent/post?text=${encodeURIComponent(text)}${url ? `&url=${encodeURIComponent(url)}` : ""}`;
const replyIntent = (tweetId: string, text: string) => `https://x.com/intent/post?in_reply_to=${tweetId}&text=${encodeURIComponent(text)}`;

function Draft({ initial, href, label, link }: { initial: string; href: (text: string) => string; label: string; link?: boolean }) {
  const [text, setText] = useState(initial);
  const length = [...text].length + (link ? 24 : 0);
  return (
    <li className="rounded-xl border border-border bg-background/60 p-3">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className="w-full resize-y rounded-lg border border-border bg-background p-2.5 text-sm leading-relaxed focus:border-accent" aria-label="Draft" />
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

export function ComposeWithClaude({ siteUrl }: { siteUrl: string }) {
  const [topic, setTopic] = useState("");
  const [drafts, setDrafts] = useState<string[]>([]);
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
              setDrafts(r.data);
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
      {drafts.length > 0 && (
        <ul className="grid gap-3 lg:grid-cols-3">
          {drafts.map((d, i) => (
            <Draft key={`${i}-${d}`} initial={d} href={(t) => postIntent(t, siteUrl)} label="Post on 𝕏" link />
          ))}
        </ul>
      )}
    </div>
  );
}

export function ReplyWithClaude() {
  const [url, setUrl] = useState("");
  const [pasted, setPasted] = useState("");
  const [angle, setAngle] = useState("");
  const [result, setResult] = useState<{ tweet: Tweet; replies: string[] } | null>(null);
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
              setResult(r.data);
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
          <ul className="grid gap-3 lg:grid-cols-3">
            {result.replies.map((d, i) => (
              <Draft key={`${result.tweet.id}-${i}-${d}`} initial={d} href={(t) => replyIntent(result.tweet.id, t)} label="Reply on 𝕏" />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
