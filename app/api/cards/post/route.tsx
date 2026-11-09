// Post image: /api/cards/post?f=x|ig&k=<kicker>&t=<title>&sb=<colored line>&m1..m3=<facts>&n=<score>&nl=<label>
//   &p=<player photo>&lg=<team logo>&l1..l5=<ranking lines>&jpg=1&s=<signature>
// Signed by the server only (lib/cards/sign.ts).
import { CARD_SIZE, verifyCardUrl, type CardFormat } from "@/lib/cards/sign";
import { cardResponse } from "@/lib/cards/respond";
import { statCardImage } from "@/lib/cards/statCard";
import { SITE_URL } from "@/lib/site";

const ALLOWED_IMAGE_HOSTS = ["a.espncdn.com", "s.espncdn.com"];
const safeImage = (u: string | null) => {
  try {
    return u && ALLOWED_IMAGE_HOSTS.includes(new URL(u).hostname) ? u : undefined;
  } catch {
    return undefined;
  }
};
const many = (q: URLSearchParams, prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => q.get(`${prefix}${i + 1}`) ?? "").filter(Boolean).map((v) => v.slice(0, 60));

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!verifyCardUrl(url.pathname, url.searchParams)) return new Response("Invalid signature", { status: 403 });
  const q = url.searchParams;
  const f: CardFormat = q.get("f") === "ig" ? "ig" : "x";
  const n = Number(q.get("n"));
  const image = await statCardImage(
    {
      kicker: (q.get("k") ?? "").slice(0, 40),
      title: (q.get("t") ?? "").slice(0, 90),
      sub: (q.get("sb") ?? "").slice(0, 40) || undefined,
      meta: many(q, "m", 3),
      big: q.has("n") && Number.isFinite(n) && n >= 1 && n <= 99 ? Math.round(n) : undefined,
      bigLabel: (q.get("nl") ?? "").slice(0, 30) || undefined,
      photo: safeImage(q.get("p")),
      logo: safeImage(q.get("lg")),
      list: many(q, "l", 5),
      site: SITE_URL.replace(/^https?:\/\//, ""),
    },
    CARD_SIZE[f],
  );
  return cardResponse(image, q.get("jpg") === "1");
}
