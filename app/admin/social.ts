"use server";
// Publishing on X and Instagram from the admin. Each action checks the admin session.
import { requireAdmin } from "@/lib/admin/session";
import { todayEastern } from "@/lib/admin/today";
import { signedCardUrl, verifyCardUrl, type CardFormat } from "@/lib/cards/sign";
import { SITE_URL } from "@/lib/site";
import type { Channel } from "@/lib/social/channels";
import { alreadyPublished, recordPublished } from "@/lib/social/history";
import { publishOnInstagram, publishReelOnInstagram } from "@/lib/social/instagram";
import { adminDb } from "@/lib/db/admin";
import { publishOnX } from "@/lib/social/x";

const CARD_LIMITS = { x: 280, instagram: 2200 };

export type PublishResult = { ok: true; url: string; warning?: string } | { ok: false; message: string };

// Only our own signed card images can be attached (no arbitrary URLs).
function checkImage(path: string): string {
  const u = new URL(path, SITE_URL);
  if (!u.pathname.startsWith("/api/cards/") || !verifyCardUrl(u.pathname, u.searchParams)) throw new Error("This image is not a Trade Score card.");
  return `${SITE_URL}${u.pathname}${u.search}`;
}

export async function publishPost(input: { id: string; channel: Channel; text: string; url: string | null; image: string; force?: boolean }): Promise<PublishResult> {
  await requireAdmin();
  try {
    const text = input.text.trim();
    if (!text) throw new Error("The text is empty.");
    if (!input.force && (await alreadyPublished(input.id))) throw new Error("Already published today. Use “Publish again” if you really want a second one.");
    const image = checkImage(input.image);

    let result: { id: string; url: string };
    if (input.channel === "x") {
      const full = input.url ? `${text}\n${input.url}` : text;
      if ([...text].length + (input.url ? 24 : 0) > CARD_LIMITS.x) throw new Error("Too long for X (280 characters, a link counts as 23).");
      const res = await fetch(image, { cache: "no-store" });
      if (!res.ok) throw new Error("The image could not be generated.");
      result = await publishOnX(full, Buffer.from(await res.arrayBuffer()));
    } else {
      if (text.length > CARD_LIMITS.instagram) throw new Error("Too long for Instagram (2,200 characters).");
      result = await publishOnInstagram(text, image);
    }

    const saved = await recordPublished({ id: input.id, channel: input.channel, day: await todayEastern(), text, image: input.image, remote_id: result.id, remote_url: result.url });
    return { ok: true, url: result.url, warning: saved ? undefined : "Published, but the history could not be saved (run supabase/migrations/004_social.sql)." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}


// Signed image for a trade card chosen in the X studio (the browser can't sign by itself).
export async function tradeCardUrl(trade: string, line: string, format: CardFormat = "x"): Promise<string> {
  await requireAdmin();
  return signedCardUrl(`/api/cards/trade/${trade}`, { f: format, line: line.slice(0, 80) || undefined, jpg: format === "ig" ? "1" : undefined });
}

// "Send to X" without the API: X opened with the text, the post is counted as sent.
export async function markSent(input: { id: string; channel: Channel; text: string; image: string }): Promise<{ ok: boolean }> {
  await requireAdmin();
  const ok = await recordPublished({ id: input.id, channel: input.channel, day: await todayEastern(), text: input.text, image: input.image, remote_id: "", remote_url: "" });
  return { ok };
}

// ---------- Weekly Reel ----------
// 1) the browser asks for an upload slot, 2) uploads the .mp4 straight to Supabase Storage (bucket "reels"),
// 3) asks the server to publish it on Instagram from its public address.
export async function reelUploadSlot(weekKey: string): Promise<{ ok: true; path: string; token: string } | { ok: false; message: string }> {
  await requireAdmin();
  try {
    const path = `${weekKey}-${Date.now()}.mp4`;
    const { data, error } = await adminDb().storage.from("reels").createSignedUploadUrl(path);
    if (error || !data) throw new Error(`Storage: ${error?.message ?? "no upload slot"} (run supabase/migrations/005_reels.sql)`);
    return { ok: true, path: data.path, token: data.token };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function publishReel(input: { id: string; path: string; caption: string }): Promise<PublishResult> {
  await requireAdmin();
  try {
    if (await alreadyPublished(input.id)) throw new Error("This week's Reel is already published.");
    const { data } = adminDb().storage.from("reels").getPublicUrl(input.path);
    const result = await publishReelOnInstagram(input.caption.trim(), data.publicUrl);
    await recordPublished({ id: input.id, channel: "instagram", day: await todayEastern(), text: input.caption, image: data.publicUrl, remote_id: result.id, remote_url: result.url });
    return { ok: true, url: result.url };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
