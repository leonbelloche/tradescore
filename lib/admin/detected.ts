import { getTransactions } from "@/lib/nba/news";

// ESPN trade lines that no stored trade quotes yet (last 30 days).
export async function detectedTrades(sources: string[]) {
  const lines = await getTransactions(100).catch(() => []);
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const known = sources.join("\n");
  return lines.filter((t) => t.date.slice(0, 10) >= since && /acquired|traded/i.test(t.description) && !known.includes(t.description));
}
