"use server";
// Publishing on X and Instagram from the admin. Each action checks the admin session.
import { requireAdmin } from "@/lib/admin/session";
import { todayEastern } from "@/lib/admin/today";
import { signedCardUrl, verifyCardUrl, type CardFormat } from "@/lib/cards/sign";
import { SITE_URL } from "@/lib/site";
import type { Channel } from "@/lib/social/channels";
import { alreadyPublished, lastPublishedAt, recordPublished } from "@/lib/social/history";
import { X_GAP_MINUTES } from "@/lib/social/limits";
import { publishOnInstagram, publishReelOnInstagram } from "@/lib/social/instagram";
import { adminDb } from "@/lib/db/admin";
import { publishOnX, replyOnX } from "@/lib/social/x";
import { replyWithLink } from "@/lib/admin/xPosts";

const CARD_LIMITS = { x: 280, instagram: 2200 };

export type PublishResult = { ok: true; url: string; warning?: string } | { ok: false; message: string };

// Only our own signed card images can be attached (no arbitrary URLs).
function checkImage(path: string): string {
  const u = new URL(path, SITE_URL);
  if (!u.pathname.startsWith("/api/cards/") || !verifyCardUrl(u.pathname, u.searchParams)) throw new Error("Cette image n'est pas une carte Trade Score.");
  return `${SITE_URL}${u.pathname}${u.search}`;
}

export async function publishPost(input: { id: string; channel: Channel; text: string; url: string | null; image: string; linkInReply?: boolean }): Promise<PublishResult> {
  await requireAdmin();
  try {
    const text = input.text.trim();
    if (!text) throw new Error("Le texte est vide.");
    if (await alreadyPublished(input.id)) throw new Error("Déjà publié aujourd'hui.");
    if (input.channel === "x") {
      // Anti-spam spacing (X limits bursts and bans accounts that post too fast): at least X_GAP_MINUTES between posts.
      const last = await lastPublishedAt("x");
      const wait = last ? X_GAP_MINUTES - Math.floor((Date.now() - Date.parse(last)) / 60_000) : 0;
      if (wait > 0) throw new Error(`Trop tôt : attends encore ${wait} minute${wait > 1 ? "s" : ""} avant le prochain post (pause anti-spam).`);
    }
    const image = checkImage(input.image);

    let result: { id: string; url: string };
    if (input.channel === "x") {
      if ([...text].length > CARD_LIMITS.x) throw new Error("Trop long pour X (280 caractères).");
      const res = await fetch(image, { cache: "no-store" });
      if (!res.ok) throw new Error("L'image n'a pas pu être générée.");
      result = await publishOnX(text, Buffer.from(await res.arrayBuffer()));
      // The link never goes in the post; optionally in a reply under it.
      if (input.linkInReply && input.url) await replyOnX(replyWithLink(input.url), result.id).catch(() => null);
    } else {
      if (text.length > CARD_LIMITS.instagram) throw new Error("Trop long pour Instagram (2 200 caractères).");
      result = await publishOnInstagram(text, image);
    }

    const saved = await recordPublished({ id: input.id, channel: input.channel, day: await todayEastern(), text, image: input.image, remote_id: result.id, remote_url: result.url });
    return { ok: true, url: result.url, warning: saved ? undefined : "Publié, mais l'historique n'a pas pu être enregistré (lance supabase/migrations/004_social.sql)." };
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
    if (error || !data) throw new Error(`Stockage : ${error?.message ?? "pas d'emplacement d'envoi"} (lance supabase/migrations/005_reels.sql)`);
    return { ok: true, path: data.path, token: data.token };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function publishReel(input: { id: string; path: string; caption: string }): Promise<PublishResult> {
  await requireAdmin();
  try {
    if (await alreadyPublished(input.id)) throw new Error("Le Reel de cette semaine est déjà publié.");
    const { data } = adminDb().storage.from("reels").getPublicUrl(input.path);
    const result = await publishReelOnInstagram(input.caption.trim(), data.publicUrl);
    await recordPublished({ id: input.id, channel: "instagram", day: await todayEastern(), text: input.caption, image: data.publicUrl, remote_id: result.id, remote_url: result.url });
    return { ok: true, url: result.url };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
