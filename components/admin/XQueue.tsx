"use client";
// X: one post at a time. Three counters (left today, late, left this week), the next post in a big card
// with its image, then: Copy image → Send to X (publishes directly when X is connected).
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { markSent, publishPost } from "@/app/admin/social";
import type { SocialPost } from "@/lib/social/channels";
import { replyWithLink } from "@/lib/admin/xPosts";

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
        <Counter label="Restants aujourd'hui" value={left.length} tone={left.length === 0 ? "done" : undefined} />
        <Counter label="En retard" value={late.length} tone="late" />
        <Counter label="Restants cette semaine" value={left.length + perDay * daysLeftAfterToday} />
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
          <p className="display text-2xl font-extrabold">Tout est fait pour aujourd’hui ✓</p>
          <p className="mt-1 text-sm text-muted">Nouveaux posts demain matin.</p>
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
  const length = [...text].length; // no link in the post
  const reply = post.url ? replyWithLink(post.url) : null;
  const [replyCopied, setReplyCopied] = useState(false);
  const [linkInReply, setLinkInReply] = useState(false);
  const tooLong = length > post.limit;

  async function copy() {
    try {
      await copyImage(post.image);
      setCopied(true);
    } catch {
      setError("Ton navigateur a bloqué la copie : clic droit sur l'image → Copier l'image.");
    }
  }

  function send() {
    setError(null);
    if (wait > 0) return;
    if (connected) {
      start(async () => {
        const r = await publishPost({ id: post.id, channel: "x", text, url: post.url, image: post.image, linkInReply });
        if (r.ok) onDone();
        else setError(r.message);
      });
      return;
    }
    // Not connected: open X with the text (paste the copied image there), then count it as sent.
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    start(async () => {
      await markSent({ id: post.id, channel: "x", text, image: post.image });
      onDone();
    });
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-border-strong bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <span className={`num rounded px-2 py-0.5 text-xs font-bold ${late ? "bg-score-1/15 text-score-1" : "bg-surface-2"}`}>{late ? `En retard · ${post.time}` : post.time}</span>
        <span className="display text-xs font-bold text-accent">{post.kind}</span>
        <span className={`num ml-auto text-xs ${tooLong ? "text-score-1" : "text-muted"}`}>
          {length}/{post.limit}
        </span>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-[1.4fr_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.image} alt={`Image pour : ${post.kind}`} className="aspect-[16/9] w-full rounded-2xl border border-border bg-surface-2 object-cover" />
        <div className="flex flex-col gap-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className="w-full flex-1 resize-y rounded-xl border border-border bg-background p-3 text-sm leading-relaxed focus:border-accent" aria-label="Texte du post" />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={copy} className={`display min-h-12 rounded-xl border-2 px-4 text-sm font-bold ${copied ? "border-score-5 text-score-5" : "border-border-strong hover:border-accent"}`}>
              {copied ? "Image copiée ✓" : "1. Copier l'image"}
            </button>
            <button type="button" onClick={send} disabled={pending || tooLong || wait > 0} className="display min-h-12 rounded-xl bg-foreground px-4 text-sm font-bold text-background hover:brightness-90 disabled:opacity-50">
              {pending ? "Envoi…" : wait > 0 ? `Attends ${wait} min` : connected ? "2. Envoyer sur 𝕏" : "2. Envoyer sur 𝕏 ▸"}
            </button>
          </div>
          <p className="text-xs text-muted">{connected ? "« Envoyer sur 𝕏 » publie le texte et l'image directement sur ton compte." : "X s'ouvre avec le texte : colle l'image avec Ctrl+V, appuie sur Post. Le post suivant apparaît ici."}</p>
          {reply && (
            <div className="rounded-xl border border-border bg-background/60 p-3 text-xs">
              <p className="display font-bold text-foreground">3. (facultatif) Le lien du site, en réponse sous ton post</p>
              <p className="mt-1 text-muted">Le lien n&apos;est jamais dans le post : le post doit se suffire à lui-même. Une fois qu&apos;il a des réponses, réponds-lui avec ce texte :</p>
              <p className="mt-2 rounded-lg bg-surface-2 px-2.5 py-2 text-foreground">{reply}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(reply).then(() => setReplyCopied(true))}
                  className={`display min-h-9 rounded-lg border px-3 font-bold ${replyCopied ? "border-score-5 text-score-5" : "border-border-strong hover:border-accent"}`}
                >
                  {replyCopied ? "Réponse copiée ✓" : "Copier la réponse"}
                </button>
                {connected && (
                  <label className="flex items-center gap-2 text-muted">
                    <input type="checkbox" checked={linkInReply} onChange={(e) => setLinkInReply(e.target.checked)} />
                    La publier automatiquement sous le post (X facture environ 0,20 $ un post avec lien)
                  </label>
                )}
              </div>
            </div>
          )}
          {wait > 0 && (
            <p className="rounded-lg bg-score-3/10 px-3 py-2 text-xs text-score-3">
              Pause anti-spam : X bannit les comptes qui postent en rafale, donc les posts sont espacés d’au moins 45 minutes. Prochain dans {wait} min. Tu peux déjà copier l’image.
            </p>
          )}
          {error && <p className="text-sm text-score-1">✕ {error}</p>}
          <button type="button" onClick={onSkip} className="self-start text-xs text-muted underline-offset-2 hover:text-foreground hover:underline">
            Passer celui-ci pour l’instant
          </button>
        </div>
      </div>
    </article>
  );
}
