"use client";
// Video studio: Claude Opus 5.5 writes the script, the browser animates it on a 1080x1920 canvas
// in the site's identity and records it to a video file you download and post (X, TikTok, Reels).
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { draftVideo, type VideoScript, type VideoTemplate } from "@/app/admin/studio";
import { field } from "./forms";

const W = 1080;
const H = 1920;
const SCENE = 2.6; // seconds per scene
const C = { bg: "#0b1426", grid: "#13213a", fg: "#eaf0f7", muted: "#8d9db6", pen: "#ff4545", accent: "#ffb020" };
const tier = (s: number) =>
  s > 79 ? { color: "#2ee6a6", label: "Heist!" } : s > 59 ? { color: "#9be15d", label: "Won It" } : s > 40 ? { color: "#ffe14a", label: "Fair Deal" } : s > 20 ? { color: "#ff8a3d", label: "Lost It" } : { color: "#ff4d5e", label: "Fleeced" };
const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

type Script = VideoScript & { logos: Record<string, string> };

// Splits text into lines that fit `max` pixels.
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > max && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function drawFrame(ctx: CanvasRenderingContext2D, script: Script, t: number, fonts: { display: string; mono: string }, logos: Map<string, HTMLImageElement>, site: string) {
  const n = script.scenes.length;
  t = Math.max(0, t); // the first animation frame can be stamped slightly before the start time
  const i = Math.max(0, Math.min(n - 1, Math.floor(t / SCENE)));
  const p = (t - i * SCENE) / SCENE; // 0..1 inside the scene
  const scene = script.scenes[i];
  const fadeIn = ease(p * 4);

  // Background + faint court grid
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 2;
  for (let x = 0; x <= W; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  // Story-style progress bars
  const gap = 12, top = 70, barW = (W - 120 - gap * (n - 1)) / n;
  for (let k = 0; k < n; k++) {
    ctx.fillStyle = "#22324d";
    ctx.fillRect(60 + k * (barW + gap), top, barW, 8);
    ctx.fillStyle = C.fg;
    const fill = k < i ? 1 : k === i ? p : 0;
    ctx.fillRect(60 + k * (barW + gap), top, barW * fill, 8);
  }

  // Logo
  ctx.fillStyle = C.fg;
  ctx.font = `800 64px ${fonts.display}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("trade score", 60, 190);
  const logoW = ctx.measureText("trade score").width;
  ctx.save();
  ctx.translate(60, 212);
  ctx.rotate(-0.025);
  ctx.fillStyle = C.pen;
  ctx.fillRect(0, 0, logoW, 9);
  ctx.restore();

  ctx.globalAlpha = fadeIn;
  ctx.textAlign = "center";
  const rise = (1 - fadeIn) * 60;

  if (scene.kind === "score") {
    const s = Math.max(1, Math.min(99, Math.round(scene.score || 50)));
    const tt = tier(s);
    const logo = logos.get(scene.team.toLowerCase());
    if (logo) ctx.drawImage(logo, W / 2 - 110, 430 + rise, 220, 220);
    ctx.fillStyle = C.fg;
    ctx.font = `800 96px ${fonts.display}`;
    ctx.fillText(scene.team || scene.heading, W / 2, 760 + rise);
    // Circle drawn like a pen stroke, number counting up
    const k = ease(p * 1.6);
    ctx.lineWidth = 26;
    ctx.lineCap = "round";
    ctx.strokeStyle = tt.color;
    ctx.beginPath();
    ctx.arc(W / 2, 1080, 230, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
    ctx.stroke();
    ctx.fillStyle = tt.color;
    ctx.font = `800 220px ${fonts.mono}`;
    ctx.textBaseline = "middle";
    ctx.fillText(String(Math.round(s * k)), W / 2, 1090);
    ctx.textBaseline = "alphabetic";
    ctx.font = `800 72px ${fonts.display}`;
    ctx.fillText(tt.label, W / 2, 1420);
    ctx.fillStyle = C.muted;
    ctx.font = `500 46px ${fonts.display}`;
    wrap(ctx, scene.body || scene.heading, W - 200).slice(0, 3).forEach((l, j) => ctx.fillText(l, W / 2, 1530 + j * 62));
  } else {
    const big = scene.kind === "outro" ? 120 : scene.kind === "title" ? 132 : 110;
    ctx.fillStyle = C.fg;
    ctx.font = `800 ${big}px ${fonts.display}`;
    const lines = wrap(ctx, scene.heading, W - 160).slice(0, 4);
    const startY = 900 - (lines.length * big * 1.05) / 2 + rise;
    lines.forEach((l, j) => ctx.fillText(l, W / 2, startY + j * big * 1.05));
    // Red pen stroke under the heading
    const last = lines[lines.length - 1] ?? "";
    const lw = ctx.measureText(last).width * ease(p * 2.2);
    ctx.save();
    ctx.translate(W / 2 - ctx.measureText(last).width / 2, startY + (lines.length - 1) * big * 1.05 + 28);
    ctx.rotate(-0.02);
    ctx.fillStyle = C.pen;
    ctx.fillRect(0, 0, lw, 14);
    ctx.restore();
    ctx.fillStyle = C.muted;
    ctx.font = `500 54px ${fonts.display}`;
    wrap(ctx, scene.body, W - 200).slice(0, 4).forEach((l, j) => ctx.fillText(l, W / 2, startY + lines.length * big * 1.05 + 90 + j * 72));
    if (scene.kind === "outro") {
      ctx.fillStyle = C.accent;
      ctx.font = `700 56px ${fonts.mono}`;
      ctx.fillText(site, W / 2, 1640);
    }
  }
  ctx.globalAlpha = 1;
}

export default function VideoStudio({ trades, site, initialScript = null }: { trades: { id: string; label: string }[]; site: string; initialScript?: Script | null }) {
  const [template, setTemplate] = useState<VideoTemplate>("explainer");
  const [tradeId, setTradeId] = useState(trades[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [script, setScript] = useState<Script | null>(initialScript);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [recording, setRecording] = useState(false);
  const [video, setVideo] = useState<{ url: string; ext: string } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const logos = useRef(new Map<string, HTMLImageElement>());
  const raf = useRef(0);

  const fonts = useCallback(() => {
    const css = getComputedStyle(document.documentElement);
    return { display: css.getPropertyValue("--font-sora").trim() || "sans-serif", mono: css.getPropertyValue("--font-jetbrains").trim() || "monospace" };
  }, []);

  // Load team logos through the site's image proxy (same origin, so the canvas can be recorded).
  useEffect(() => {
    if (!script) return;
    for (const [name, url] of Object.entries(script.logos)) {
      if (logos.current.has(name)) continue;
      const img = new Image();
      img.src = `/_next/image?url=${encodeURIComponent(url)}&w=256&q=75`;
      img.onload = () => logos.current.set(name, img);
    }
  }, [script]);

  const total = script ? script.scenes.length * SCENE : 0;

  const play = useCallback(
    (onEnd?: () => void) => {
      const ctx = canvas.current?.getContext("2d");
      if (!ctx || !script) return;
      cancelAnimationFrame(raf.current);
      const f = fonts();
      let t0 = -1;
      const tick = (now: number) => {
        if (t0 < 0) t0 = now;
        const t = (now - t0) / 1000;
        drawFrame(ctx, script, Math.min(t, total - 0.001), f, logos.current, site);
        if (t < total) raf.current = requestAnimationFrame(tick);
        else onEnd?.();
      };
      raf.current = requestAnimationFrame(tick);
    },
    [script, total, fonts, site],
  );

  // Show the first frame as soon as a script arrives.
  useEffect(() => {
    if (!script) return;
    const f = fonts();
    document.fonts.load(`800 64px ${f.display}`).finally(() => play());
    return () => cancelAnimationFrame(raf.current);
  }, [script, play, fonts]);

  function record() {
    const el = canvas.current;
    if (!el || !script) return;
    const type = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
    if (!type) {
      setError("This browser can't record video. Use Chrome or Edge.");
      return;
    }
    const recorder = new MediaRecorder(el.captureStream(30), { mimeType: type, videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      if (video) URL.revokeObjectURL(video.url);
      setVideo({ url: URL.createObjectURL(new Blob(chunks, { type })), ext: type.startsWith("video/mp4") ? "mp4" : "webm" });
      setRecording(false);
    };
    setRecording(true);
    recorder.start();
    play(() => setTimeout(() => recorder.stop(), 150));
  }

  const editScene = (k: number, patch: Partial<Script["scenes"][number]>) =>
    setScript((s) => (s ? { ...s, scenes: s.scenes.map((sc, j) => (j === k ? { ...sc, ...patch } : sc)) } : s));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-5">
        <form
          className="space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-5"
          onSubmit={(e) => {
            e.preventDefault();
            setVideo(null);
            start(async () => {
              const r = await draftVideo(template, tradeId, note);
              if (r.ok) {
                setScript(r.data);
                setError(null);
              } else setError(r.message);
            });
          }}
        >
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ["explainer", "How Trade Score works"],
                ["trade", "Break down a trade"],
                ["heists", "Top 3 heists"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium ${template === value ? "border-accent bg-accent/10" : "border-border"}`}>
                <input type="radio" name="template" value={value} checked={template === value} onChange={() => setTemplate(value)} className="accent-[var(--accent)]" />
                {label}
              </label>
            ))}
          </div>
          {template === "trade" && (
            <select value={tradeId} onChange={(e) => setTradeId(e.target.value)} className={field} aria-label="Trade">
              {trades.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="(optional) direction for Claude: more hype, roast the Lakers, French accent…" className={field} aria-label="Direction" />
          <button type="submit" disabled={pending} className="display inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-bold text-black hover:brightness-110 disabled:opacity-50">
            {pending ? "Claude Opus 5.5 is writing the script…" : "✦ Generate the video script"}
          </button>
          {error && <p className="text-sm text-score-1">✕ {error}</p>}
        </form>

        {script && (
          <div className="space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="display text-lg font-bold">{script.title}</h2>
              <span className="num text-xs text-muted">
                {script.scenes.length} scenes · {Math.round(total)} s · edit any text, then replay
              </span>
            </div>
            <ol className="space-y-2">
              {script.scenes.map((sc, k) => (
                <li key={k} className="grid gap-2 rounded-lg border border-border p-2 sm:grid-cols-[5rem_1fr_1fr]">
                  <span className="num self-center text-xs text-muted">
                    {k + 1}. {sc.kind}
                    {sc.kind === "score" ? ` · ${sc.score}` : ""}
                  </span>
                  <input value={sc.heading} onChange={(e) => editScene(k, { heading: e.target.value })} className="min-h-9 rounded-md border border-border bg-background px-2 text-sm" aria-label={`Scene ${k + 1} heading`} />
                  <input value={sc.body} onChange={(e) => editScene(k, { body: e.target.value })} className="min-h-9 rounded-md border border-border bg-background px-2 text-sm" aria-label={`Scene ${k + 1} text`} />
                </li>
              ))}
            </ol>
            <div>
              <p className="display mb-1 text-xs font-bold text-muted">Caption for X</p>
              <textarea value={script.caption} onChange={(e) => setScript({ ...script, caption: e.target.value })} rows={3} className={`${field} py-2`} aria-label="Caption" />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        <div className="mx-auto aspect-[9/16] w-full max-w-[300px] overflow-hidden rounded-2xl border border-border bg-background">
          {script ? (
            <canvas ref={canvas} width={W} height={H} className="h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">The video preview appears here (1080×1920, vertical).</div>
          )}
        </div>
        {script && (
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => play()} disabled={recording} className="display min-h-11 rounded-lg border border-border-strong px-4 text-sm font-bold hover:border-accent disabled:opacity-50">
              ▶ Replay
            </button>
            <button type="button" onClick={record} disabled={recording} className="display min-h-11 rounded-lg bg-accent px-4 text-sm font-bold text-black hover:brightness-110 disabled:opacity-50">
              {recording ? `● Recording… (${Math.round(total)} s)` : "● Make the video file"}
            </button>
            {video && (
              <>
                <a href={video.url} download={`trade-score-${script.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}.${video.ext}`} className="display inline-flex min-h-11 items-center justify-center rounded-lg bg-score-5 px-4 text-sm font-bold text-black">
                  ⬇ Download .{video.ext}
                </a>
                <a href={`https://x.com/intent/post?text=${encodeURIComponent(script.caption)}`} target="_blank" rel="noopener noreferrer" className="display inline-flex min-h-11 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-bold text-background">
                  Open X with the caption ▸
                </a>
                <p className="text-xs text-muted">On X, click the image icon and attach the video you just downloaded.{video.ext === "webm" ? " This browser made a .webm: X needs .mp4, so use Chrome or Edge." : ""}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
