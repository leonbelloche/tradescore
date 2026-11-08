// Trade card for X (1600x900 PNG): /api/cards/trade/<slug>?line=<punchline>
// Public on purpose: it only shows public data (the same as the trade page).
import { tradeCardImage } from "@/lib/cards/tradeCard";
import { SITE_URL } from "@/lib/site";
import { getScoredTrades } from "@/lib/trades/scored";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trade = (await getScoredTrades()).find((t) => t.id === id);
  if (!trade) return new Response("Trade not found", { status: 404 });
  const raw = new URL(request.url).searchParams.get("line") ?? "";
  const line = raw.replace(/\s+/g, " ").trim().slice(0, 80) || undefined;
  return tradeCardImage(trade, { width: 1600, height: 900, line, detailed: true, site: SITE_URL.replace(/^https?:\/\//, "") });
}
