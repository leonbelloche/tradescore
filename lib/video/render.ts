// Draws one frame of a vertical video (1080x1920) in the site identity: story bars, logo, text cards,
// circled scores that count up, red pen strokes. Used by the Instagram Reel studio (browser only).
export const W = 1080;
export const H = 1920;
export const SCENE = 2.6; // seconds per scene
const C = { bg: "#0b1426", grid: "#13213a", fg: "#eaf0f7", muted: "#8d9db6", pen: "#ff4545", accent: "#ffb020" };
const tier = (s: number) =>
  s > 79 ? { color: "#2ee6a6", label: "Heist!" } : s > 59 ? { color: "#9be15d", label: "Won It" } : s > 40 ? { color: "#ffe14a", label: "Fair Deal" } : s > 20 ? { color: "#ff8a3d", label: "Lost It" } : { color: "#ff4d5e", label: "Fleeced" };
const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

export type ReelScene = { kind: "title" | "text" | "score" | "outro"; heading: string; body: string; team: string; score: number };
export type ReelScript = { title: string; scenes: ReelScene[]; caption: string; logos: Record<string, string>; durations?: number[] };

// Seconds per scene: SCENE each, or longer when a voice-over line needs more time.
export const sceneDurations = (script: ReelScript) => script.scenes.map((_, i) => script.durations?.[i] ?? SCENE);
export const totalDuration = (script: ReelScript) => sceneDurations(script).reduce((a, b) => a + b, 0);

// What the voice says on each scene (plain words, read aloud).
export function narrationFor(scene: ReelScene): string {
  const clean = (s: string) =>
    s
      .replace(/(\d+)\/99/g, "$1 out of 99")
      .replace(/#(\d)/g, "number $1")
      .replace(/vs/g, "versus")
      .replace(/·/g, ",")
      .replace(/\s+/g, " ")
      .trim();
  const end = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);
  if (scene.kind === "score") return clean(`${scene.team}: ${scene.score} out of 99. ${end(tier(scene.score).label)} ${end(scene.body)}`);
  if (scene.kind === "outro") return "Who got robbed? We do the math. Follow Trade Score: every NBA trade, graded.";
  return clean(`${end(scene.heading)} ${scene.body ? end(scene.body) : ""}`);
}
type Script = ReelScript;

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

export function drawFrame(ctx: CanvasRenderingContext2D, script: Script, t: number, fonts: { display: string; mono: string }, logos: Map<string, HTMLImageElement>, site: string) {
  const n = script.scenes.length;
  t = Math.max(0, t); // the first animation frame can be stamped slightly before the start time
  const lengths = sceneDurations(script);
  let i = 0, start = 0;
  while (i < n - 1 && t >= start + lengths[i]) start += lengths[i++];
  const p = Math.min(1, (t - start) / lengths[i]); // 0..1 inside the scene
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
