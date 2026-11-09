// Generic post image: /api/cards/post?f=x|ig&k=<kicker>&t=<title>&n=<big number>&nl=<label>&p=<photo>&l1=<line>...&l5=<line>&jpg=1&s=<signature>
// Signed by the server only (lib/cards/sign.ts).
import { CARD_SIZE, verifyCardUrl, type CardFormat } from "@/lib/cards/sign";
import { cardResponse } from "@/lib/cards/respond";
import { statCardImage } from "@/lib/cards/statCard";
import { SITE_URL } from "@/lib/site";

const ALLOWED_PHOTO_HOSTS = ["a.espncdn.com", "s.espncdn.com"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!verifyCardUrl(url.pathname, url.searchParams)) return new Response("Invalid signature", { status: 403 });
  const q = url.searchParams;
  const f: CardFormat = q.get("f") === "ig" ? "ig" : "x";
  const n = Number(q.get("n"));
  const photo = q.get("p") ?? undefined;
  const safePhoto = photo && ALLOWED_PHOTO_HOSTS.includes(new URL(photo).hostname) ? photo : undefined;
  const image = await statCardImage(
    {
      kicker: (q.get("k") ?? "").slice(0, 40),
      title: (q.get("t") ?? "").slice(0, 90),
      big: Number.isFinite(n) && n >= 1 && n <= 99 ? Math.round(n) : undefined,
      bigLabel: (q.get("nl") ?? "").slice(0, 30) || undefined,
      photo: safePhoto,
      lines: [1, 2, 3, 4, 5].map((i) => q.get(`l${i}`) ?? "").filter(Boolean).map((l) => l.slice(0, 60)),
      site: SITE_URL.replace(/^https?:\/\//, ""),
    },
    CARD_SIZE[f],
  );
  return cardResponse(image, q.get("jpg") === "1");
}
