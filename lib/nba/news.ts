// ESPN's public NBA news feed and transactions list (refreshed every few minutes).
import { cacheLife } from "next/cache";

export type NewsItem = {
  id: string;
  type: string; // "HeadlineNews", "Story", "Recap", "Preview", "Media"...
  headline: string;
  description: string;
  published: string; // ISO
  url: string | null;
  image: string | null;
  athletes: string[]; // player names ESPN tagged in the article
  teams: string[]; // team names ESPN tagged
};

export type Transaction = { date: string; description: string; team: string; abbreviation: string };

type EspnArticle = {
  id?: number;
  dataSourceIdentifier?: string;
  type: string;
  headline: string;
  description?: string;
  published: string;
  links?: { web?: { href?: string } };
  images?: { url?: string }[];
  categories?: { type: string; description?: string }[];
};

export async function getNews(): Promise<NewsItem[]> {
  "use cache";
  cacheLife("minutes");
  const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news?limit=50");
  if (!res.ok) throw new Error(`ESPN news: HTTP ${res.status}`);
  const json = (await res.json()) as { articles?: EspnArticle[] };
  return (json.articles ?? []).map((a, i) => ({
    id: String(a.id ?? a.dataSourceIdentifier ?? i),
    type: a.type,
    headline: a.headline,
    description: a.description ?? "",
    published: a.published,
    url: a.links?.web?.href ?? null,
    image: a.images?.[0]?.url ?? null,
    athletes: (a.categories ?? []).filter((c) => c.type === "athlete" && c.description).map((c) => c.description!),
    teams: (a.categories ?? []).filter((c) => c.type === "team" && c.description).map((c) => c.description!),
  }));
}

export async function getTransactions(limit = 20): Promise<Transaction[]> {
  "use cache";
  cacheLife("minutes");
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/transactions?limit=${limit}`);
  if (!res.ok) throw new Error(`ESPN transactions: HTTP ${res.status}`);
  const json = (await res.json()) as { transactions?: { date: string; description: string; team: { displayName: string; abbreviation: string } }[] };
  return (json.transactions ?? []).map((t) => ({ date: t.date, description: t.description, team: t.team.displayName, abbreviation: t.team.abbreviation }));
}

// Articles about trades: rumors, interest, deadline talk, completed deals.
const TRADE_WORDS = /\btrad(e|es|ed|ing)\b|rumou?r|deadline|acquir|\bswap|on the block|trade market|interest in|shopping|available/i;
export const isTradeTalk = (n: NewsItem) => TRADE_WORDS.test(`${n.headline} ${n.description}`);
