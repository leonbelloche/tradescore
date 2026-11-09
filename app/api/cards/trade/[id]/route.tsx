// Trade card image: /api/cards/trade/<slug>?f=x|ig&line=<punchline>&jpg=1&s=<signature>
// Only URLs signed by the server work (lib/cards/sign.ts), so nobody can print their own text on our cards.
import { CARD_SIZE, verifyCardUrl, type CardFormat } from "@/lib/cards/sign";
import { cardResponse } from "@/lib/cards/respond";
import { tradeCardImage } from "@/lib/cards/tradeCard";
import { SITE_URL } from "@/lib/site";
import { getScoredTrades } from "@/lib/trades/scored";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  if (!verifyCardUrl(url.pathname, url.searchParams)) return new Response("Invalid signature", { status: 403 });
  const trade = (await getScoredTrades()).find((t) => t.id === id);
  if (!trade) return new Response("Trade not found", { status: 404 });
  const f: CardFormat = url.searchParams.get("f") === "ig" ? "ig" : "x";
  const line = (url.searchParams.get("line") ?? "").replace(/\s+/g, " ").trim().slice(0, 80) || undefined;
  const image = await tradeCardImage(trade, { ...CARD_SIZE[f], line, detailed: true, site: SITE_URL.replace(/^https?:\/\//, "") });
  return cardResponse(image, url.searchParams.get("jpg") === "1");
}
