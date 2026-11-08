// Share image (1200x630) for a trade: shown when the link is pasted on Discord, X, iMessage...
import { tradeCardImage } from "@/lib/cards/tradeCard";
import { getScoredTrades } from "@/lib/trades/scored";

export const alt = "Trade Score: who won the trade";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trade = (await getScoredTrades()).find((t) => t.id === id);
  return tradeCardImage(trade, size);
}
