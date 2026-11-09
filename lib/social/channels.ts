// One queue of posts per channel (X, Instagram), built from the posts of the day.
// Same content everywhere, adapted per channel: image size, caption, link, hashtags.
import type { CardSpec, XPost } from "@/lib/admin/xPosts";
import { signedCardUrl, type CardFormat } from "@/lib/cards/sign";

export type Channel = "x" | "instagram";

export type SocialPost = {
  id: string; // `${channel}:${post id}`, stable for the day
  channel: Channel;
  time: string;
  kind: string;
  text: string;
  url: string | null; // X only: link card added after the text
  image: string; // signed path of the generated image (relative to the site)
  limit: number; // max characters
};

export const CHANNELS: Record<Channel, { name: string; limit: number; format: CardFormat; jpeg: boolean }> = {
  x: { name: "X", limit: 280, format: "x", jpeg: false },
  instagram: { name: "Instagram", limit: 2200, format: "ig", jpeg: true }, // Instagram only accepts JPEG, 4:5 portrait
};

export function cardImageUrl(card: CardSpec, format: CardFormat, jpeg: boolean): string {
  const jpg = jpeg ? "1" : undefined;
  if (card.type === "trade") return signedCardUrl(`/api/cards/trade/${card.id}`, { f: format, line: card.line, jpg });
  const lines = (card.lines ?? []).slice(0, 5);
  return signedCardUrl("/api/cards/post", {
    f: format,
    k: card.kicker,
    t: card.title,
    n: card.big !== undefined ? String(card.big) : undefined,
    nl: card.bigLabel,
    p: card.photo ?? undefined,
    ...Object.fromEntries(lines.map((l, i) => [`l${i + 1}`, l])),
    jpg,
  });
}

// Instagram caption: no clickable links there, more hashtags, "link in bio".
function instagramCaption(text: string): string {
  const body = text.replace(/\s*#NBA\b/g, "").trim();
  return `${body}\n\nEvery NBA trade graded 1 to 99. Full breakdown: link in bio.\n\n#NBA #NBATrades #Basketball #TradeScore`;
}

export function forChannel(posts: XPost[], channel: Channel): SocialPost[] {
  const c = CHANNELS[channel];
  return posts.map((p) => ({
    id: `${channel}:${p.id}`,
    channel,
    time: p.time,
    kind: p.kind,
    text: channel === "instagram" ? instagramCaption(p.text) : p.text,
    url: channel === "x" ? p.url : null,
    image: cardImageUrl(p.card, c.format, c.jpeg),
    limit: c.limit,
  }));
}
