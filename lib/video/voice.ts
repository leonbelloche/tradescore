"use client";
// Voice-over for the Reels, made in the browser with Kokoro (free, open model, no key, no account).
// The model (~90 MB) downloads the first time, then the browser keeps it.
import type { KokoroTTS } from "kokoro-js";

export const VOICES = [
  { id: "am_michael", label: "Homme · Michael (posé)" },
  { id: "am_adam", label: "Homme · Adam (énergique)" },
  { id: "am_fenrir", label: "Homme · Fenrir (grave)" },
  { id: "af_heart", label: "Femme · Heart" },
  { id: "af_bella", label: "Femme · Bella" },
] as const;

let model: Promise<KokoroTTS> | null = null;

function load(onProgress?: (pct: number) => void): Promise<KokoroTTS> {
  model ??= import("kokoro-js").then(({ KokoroTTS }) =>
    KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
      dtype: "q8",
      device: "wasm",
      progress_callback: (e: { status?: string; progress?: number }) => {
        if (e.status === "progress" && typeof e.progress === "number") onProgress?.(Math.round(e.progress));
      },
    }),
  );
  model.catch(() => (model = null)); // allow a retry after a failed download
  return model;
}

// One audio clip per line, ready to be played or mixed into the video.
export async function speakLines(lines: string[], voice: string, audio: AudioContext, onProgress?: (msg: string) => void): Promise<AudioBuffer[]> {
  onProgress?.("Chargement de la voix…");
  const tts = await load((pct) => onProgress?.(`Téléchargement de la voix (une seule fois) : ${pct} %`));
  const out: AudioBuffer[] = [];
  for (let i = 0; i < lines.length; i++) {
    onProgress?.(`Voix off : phrase ${i + 1} sur ${lines.length}…`);
    const raw = (await tts.generate(lines[i], { voice: voice as never })) as unknown as { audio: Float32Array; sampling_rate: number };
    const buf = audio.createBuffer(1, raw.audio.length, raw.sampling_rate);
    buf.copyToChannel(new Float32Array(raw.audio), 0);
    out.push(buf);
  }
  return out;
}
