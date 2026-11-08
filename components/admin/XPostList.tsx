"use client";

import { useState, useSyncExternalStore } from "react";
import { intentUrl, X_LIMIT, xLength, type XPost } from "@/lib/admin/xPosts";

const KEY = "tradescore:x-posted";
const EVENT = "tradescore:x-posted-changed";

// Which posts were already sent, remembered in this browser only.
function readRaw(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function setPosted(id: string, on: boolean) {
  const ids = new Set<string>(JSON.parse(readRaw()));
  if (on) ids.add(id);
  else ids.delete(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...ids].slice(-200)));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export default function XPostList({ posts }: { posts: XPost[] }) {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  const posted = new Set<string>(JSON.parse(raw));
  const done = posts.filter((p) => posted.has(p.id)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-accent transition-all" style={{ width: `${posts.length ? (done / posts.length) * 100 : 0}%` }} />
        </div>
        <span className="num text-sm text-muted">
          {done}/{posts.length} posted
        </span>
      </div>
      <ol className="space-y-3">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} posted={posted.has(p.id)} />
        ))}
      </ol>
    </div>
  );
}

function PostCard({ post, posted }: { post: XPost; posted: boolean }) {
  const [text, setText] = useState(post.text);
  const [copied, setCopied] = useState(false);
  const length = xLength(text, post.url);
  const tooLong = length > X_LIMIT;

  async function copy() {
    try {
      await navigator.clipboard.writeText(post.url ? `${text}\n${post.url}` : text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <li className={`rounded-2xl border bg-surface p-3 sm:p-4 ${posted ? "border-border opacity-60" : "border-border-strong"}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="num rounded bg-surface-2 px-2 py-0.5 text-xs font-bold">{post.time}</span>
        <span className="display text-xs font-bold text-accent">{post.kind}</span>
        <span className={`num ml-auto text-xs ${tooLong ? "text-score-1" : "text-muted"}`}>
          {length}/{X_LIMIT}
        </span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(9, text.split("\n").length + 1)}
        aria-label={`Post for ${post.time}`}
        className="w-full resize-y rounded-lg border border-border bg-background p-2.5 text-sm leading-relaxed focus:border-accent"
      />
      {post.url && <p className="mt-1 truncate text-xs text-muted">🔗 {post.url}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={tooLong ? undefined : intentUrl({ text, url: post.url })}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={tooLong}
          onClick={() => !tooLong && setPosted(post.id, true)}
          className={`display inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-bold ${
            tooLong ? "cursor-not-allowed bg-surface-2 text-muted" : "bg-foreground text-background hover:brightness-90"
          }`}
        >
          Post on 𝕏 ▸
        </a>
        <button type="button" onClick={copy} className="display min-h-11 rounded-lg border border-border-strong px-4 text-sm font-bold hover:border-accent">
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <label className="ml-auto flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={posted} onChange={(e) => setPosted(post.id, e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
          Posted
        </label>
      </div>
    </li>
  );
}
