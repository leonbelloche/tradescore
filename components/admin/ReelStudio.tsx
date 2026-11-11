"use client";
// Instagram: one Reel a week. The script is written from the site's data (Claude can rewrite it if connected),
// the browser animates it in our colors and makes the .mp4, then "Send to Instagram".
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@supabase/supabase-js";
import { markSent, publishReel, reelUploadSlot } from "@/app/admin/social";
import { draftVideo } from "@/app/admin/studio";
import { drawFrame, H, narrationFor, SCENE, sceneDurations, totalDuration, W, type ReelScript } from "@/lib/video/render";
import { speakLines, VOICES } from "@/lib/video/voice";

type Props = {
  weekKey: string;
  reelId: string;
  script: ReelScript;
  formatLabel: string;
  done: { url: string | null } | null;
  connected: boolean;
  claude: boolean;
  site: string;
  daysLeft: number;
  reelsThisMonth: number;
};

function Counter({ label, value, tone }: { label: string; value: string; tone?: "done" | "todo" }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === "todo" ? "border-accent/50 bg-accent/10" : "border-border bg-surface"}`}>
      <p className="display text-xs font-bold text-muted">{label}</p>
      <p className={`display mt-1 text-3xl font-extrabold ${tone === "done" ? "text-score-5" : tone === "todo" ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}

export default function ReelStudio({ weekKey, reelId, script: initial, formatLabel, done, connected, claude, site, daysLeft, reelsThisMonth }: Props) {
  const [script, setScript] = useState(initial);
  const [published, setPublished] = useState(done);
  const [video, setVideo] = useState<{ blob: Blob; url: string; ext: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const logos = useRef(new Map<string, HTMLImageElement>());
  const raf = useRef(0);
  const total = totalDuration(script);
  // Voice-over: one clip per scene, made in the browser (lib/video/voice.ts).
  const [voice, setVoice] = useState<string>(VOICES[0].id);
  const [voiceClips, setVoiceClips] = useState<AudioBuffer[] | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [useVoice, setUseVoice] = useState(true);
  const audio = useRef<AudioContext | null>(null);
  const playing = useRef<AudioBufferSourceNode[]>([]);
  const audioCtx = () => (audio.current ??= new AudioContext());

  // Plays the voice clips in sync with the animation, into `out` (speakers, or the video being recorded).
  const playVoice = useCallback(
    (outs: AudioNode[]) => {
      for (const s of playing.current) s.stop();
      playing.current = [];
      if (!voiceClips || !useVoice) return;
      const ac = audioCtx();
      const lengths = sceneDurations(script);
      let at = ac.currentTime + 0.15;
      voiceClips.forEach((clip, i) => {
        const src = ac.createBufferSource();
        src.buffer = clip;
        for (const o of outs) src.connect(o);
        src.start(at + 0.2);
        playing.current.push(src);
        at += lengths[i] ?? SCENE;
      });
    },
    [voiceClips, useVoice, script],
  );

  async function prepareVoice() {
    setMessage(null);
    try {
      const ac = audioCtx();
      await ac.resume();
      const clips = await speakLines(script.scenes.map(narrationFor), voice, ac, setVoiceStatus);
      setVoiceClips(clips);
      setScript((s) => ({ ...s, durations: clips.map((c) => Math.max(SCENE, c.duration + 0.6)) }));
      setVideo(null);
      setVoiceStatus(null);
    } catch (e) {
      setVoiceStatus(null);
      setMessage({ ok: false, text: `La voix off n'a pas pu être créée : ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  const fonts = useCallback(() => {
    const css = getComputedStyle(document.documentElement);
    return { display: css.getPropertyValue("--font-sora").trim() || "sans-serif", mono: css.getPropertyValue("--font-jetbrains").trim() || "monospace" };
  }, []);

  // Team logos through the site's image proxy (same origin, so the canvas can be recorded).
  useEffect(() => {
    for (const [name, url] of Object.entries(script.logos)) {
      if (logos.current.has(name)) continue;
      const img = new Image();
      img.src = `/_next/image?url=${encodeURIComponent(url)}&w=256&q=75`;
      img.onload = () => logos.current.set(name, img);
    }
  }, [script]);

  const play = useCallback(
    (onEnd?: () => void, voiceOuts?: AudioNode[]) => {
      const ctx = canvas.current?.getContext("2d");
      if (!ctx) return;
      cancelAnimationFrame(raf.current);
      const f = fonts();
      let t0 = -1;
      playVoice(voiceOuts ?? [audioCtx().destination]);
      const tick = (now: number) => {
        if (t0 < 0) t0 = now;
        const t = (now - t0) / 1000;
        drawFrame(ctx, script, Math.min(t, total - 0.001), f, logos.current, site);
        if (t < total) raf.current = requestAnimationFrame(tick);
        else onEnd?.();
      };
      raf.current = requestAnimationFrame(tick);
    },
    [script, total, fonts, site, playVoice],
  );

  useEffect(() => {
    const f = fonts();
    document.fonts.load(`800 64px ${f.display}`).finally(() => play());
    return () => cancelAnimationFrame(raf.current);
  }, [play, fonts]);

  function generate() {
    const el = canvas.current;
    if (!el) return;
    const voiced = Boolean(voiceClips && useVoice);
    const types = voiced
      ? ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"]
      : ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
    const type = types.find((m) => MediaRecorder.isTypeSupported(m));
    if (!type) return setMessage({ ok: false, text: "Ce navigateur ne sait pas faire de vidéos. Utilise Chrome ou Edge." });
    const stream = el.captureStream(30);
    let outs: AudioNode[] = [];
    if (voiced) {
      const ac = audioCtx();
      void ac.resume();
      const dest = ac.createMediaStreamDestination();
      for (const track of dest.stream.getAudioTracks()) stream.addTrack(track);
      outs = [dest, ac.destination]; // into the video, and out loud so you hear it
    }
    const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      if (video) URL.revokeObjectURL(video.url);
      const blob = new Blob(chunks, { type });
      setVideo({ blob, url: URL.createObjectURL(blob), ext: type.startsWith("video/mp4") ? "mp4" : "webm" });
      setRecording(false);
    };
    setMessage(null);
    setRecording(true);
    recorder.start();
    play(() => setTimeout(() => recorder.stop(), 400), outs);
  }

  function rewriteWithClaude() {
    start(async () => {
      const template = script.title.startsWith("How") ? "explainer" : script.title.includes("heists") ? "heists" : "trade";
      const r = await draftVideo(template, "", "");
      if (r.ok) {
        setScript({ title: r.data.title, scenes: r.data.scenes, caption: r.data.caption, logos: { ...script.logos, ...r.data.logos } });
        setVideo(null);
        setVoiceClips(null); // new text: the voice must be made again
      } else setMessage({ ok: false, text: r.message });
    });
  }

  function download() {
    if (!video) return;
    const a = document.createElement("a");
    a.href = video.url;
    a.download = `trade-score-reel-${weekKey}.${video.ext}`;
    a.click();
  }

  function send() {
    if (!video) return;
    setMessage(null);
    if (!connected) {
      // Not connected: save the video, copy the caption, open Instagram; you upload it there.
      download();
      navigator.clipboard.writeText(script.caption).catch(() => {});
      window.open("https://www.instagram.com/", "_blank", "noopener");
      start(async () => {
        await markSent({ id: reelId, channel: "instagram", text: script.caption, image: "" });
        setPublished({ url: null });
        setMessage({ ok: true, text: "Vidéo enregistrée et légende copiée : sur Instagram, touche + → Reel, choisis la vidéo, colle la légende." });
      });
      return;
    }
    start(async () => {
      const slot = await reelUploadSlot(weekKey);
      if (!slot.ok) return setMessage({ ok: false, text: slot.message });
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
      const up = await sb.storage.from("reels").uploadToSignedUrl(slot.path, slot.token, video.blob, { contentType: video.blob.type });
      if (up.error) return setMessage({ ok: false, text: `L'envoi a échoué : ${up.error.message}` });
      const r = await publishReel({ id: reelId, path: slot.path, caption: script.caption });
      if (r.ok) setPublished({ url: r.url });
      else setMessage({ ok: false, text: r.message });
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Counter label="Reel de la semaine" value={published ? "Fait ✓" : "À faire"} tone={published ? "done" : "todo"} />
        <Counter label="Fin de la semaine dans" value={`${daysLeft} jour${daysLeft > 1 ? "s" : ""}`} />
        <Counter label="Reels ce mois-ci" value={String(reelsThisMonth + (published && !done ? 1 : 0))} />
      </div>

      <article className="overflow-hidden rounded-3xl border border-border-strong bg-surface">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          <span className="num rounded bg-surface-2 px-2 py-0.5 text-xs font-bold">{weekKey}</span>
          <span className="display text-xs font-bold text-accent">{formatLabel}</span>
          <span className="num ml-auto text-xs text-muted">
            {script.scenes.length} scènes · {Math.round(total)} s · 1080×1920
          </span>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-[280px_1fr]">
          <div className="mx-auto w-full max-w-[280px] space-y-2">
            <div className="aspect-[9/16] overflow-hidden rounded-2xl border border-border bg-background">
              <canvas ref={canvas} width={W} height={H} className="h-full w-full" />
            </div>
            <button type="button" onClick={() => play()} disabled={recording} className="display min-h-10 w-full rounded-lg border border-border-strong text-sm font-bold hover:border-accent disabled:opacity-50">
              ▶ Rejouer
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="display text-2xl font-extrabold">{script.title}</h2>
            <div>
              <p className="display mb-1 text-xs font-bold text-muted">Légende</p>
              <textarea value={script.caption} onChange={(e) => setScript({ ...script, caption: e.target.value })} rows={7} className="w-full resize-y rounded-xl border border-border bg-background p-3 text-sm leading-relaxed focus:border-accent" aria-label="Légende" />
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="display font-bold">🎙 Voix off</p>
                <select value={voice} onChange={(e) => { setVoice(e.target.value); setVoiceClips(null); }} className="min-h-9 rounded-lg border border-border-strong bg-background px-2 text-xs" aria-label="Voix">
                  {VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={prepareVoice} disabled={Boolean(voiceStatus) || recording} className={`display min-h-9 rounded-lg border px-3 text-xs font-bold disabled:opacity-50 ${voiceClips ? "border-score-5 text-score-5" : "border-border-strong hover:border-accent"}`}>
                  {voiceStatus ? "…" : voiceClips ? "Voix prête ✓ (refaire)" : "Créer la voix off"}
                </button>
                {voiceClips && (
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <input type="checkbox" checked={useVoice} onChange={(e) => setUseVoice(e.target.checked)} /> dans la vidéo
                  </label>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {voiceStatus ??
                  (voiceClips
                    ? "La voix lit chaque scène en anglais. Clique sur ▶ Rejouer pour l'écouter, puis génère la vidéo."
                    : "Une voix anglaise lit le Reel, scène par scène. Gratuit, fait dans ton navigateur. La première fois, la voix se télécharge (environ 90 Mo).")}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={generate} disabled={recording} className={`display min-h-12 rounded-xl border-2 px-4 text-sm font-bold ${video ? "border-score-5 text-score-5" : "border-border-strong hover:border-accent"} disabled:opacity-50`}>
                {recording ? `● Génération… (${Math.round(total)} s, garde cet onglet ouvert)` : video ? "Vidéo prête ✓ (refaire)" : "1. Générer la vidéo"}
              </button>
              {published?.url ? (
                <a href={published.url} target="_blank" rel="noopener noreferrer" className="display inline-flex min-h-12 items-center justify-center rounded-xl bg-score-5 px-4 text-sm font-bold text-black">
                  Voir le Reel ▸
                </a>
              ) : (
                <button type="button" onClick={send} disabled={!video || pending || recording} className="display min-h-12 rounded-xl bg-foreground px-4 text-sm font-bold text-background hover:brightness-90 disabled:opacity-40">
                  {pending ? "Envoi… (jusqu'à 2 min)" : "2. Envoyer sur Instagram"}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(script.caption).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  })
                }
                className="text-muted underline-offset-2 hover:text-foreground hover:underline"
              >
                {copied ? "Légende copiée ✓" : "Copier la légende"}
              </button>
              {video && (
                <button type="button" onClick={download} className="text-muted underline-offset-2 hover:text-foreground hover:underline">
                  Enregistrer le .{video.ext}
                </button>
              )}
              {claude && (
                <button type="button" onClick={rewriteWithClaude} disabled={pending} className="text-accent underline-offset-2 hover:underline">
                  ✦ Réécrire avec Claude
                </button>
              )}
            </div>
            <p className="text-xs text-muted">
              {connected ? "« Envoyer sur Instagram » envoie la vidéo et publie le Reel sur ton compte." : "Instagram n'est pas encore connecté : « Envoyer » enregistre la vidéo, copie la légende et ouvre Instagram."}
              {video?.ext === "webm" ? " Ce navigateur a fait un .webm : utilise Chrome ou Edge pour un .mp4." : ""}
            </p>
            {message && <p className={`text-sm ${message.ok ? "text-score-5" : "text-score-1"}`}>{message.ok ? "✓ " : "✕ "}{message.text}</p>}
          </div>
        </div>
      </article>
    </div>
  );
}
