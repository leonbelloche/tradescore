// "Posts of the day" for the Trade Score account on X: ready-to-post texts built from the site's own data
// (graded trades, last night's games, tonight's games, trade ideas, player values, ESPN trade talk).
// Same posts all day, new ones every day (the date seeds the choices). Pure function: easy to test.
import type { TeamWithRoster } from "@/lib/db/teams";
import type { Game } from "@/lib/nba/scoreboard";
import type { NewsItem } from "@/lib/nba/news";
import type { ValuedPlayer } from "@/lib/players/values";
import { tierFor } from "@/lib/score";
import type { TradeIdea } from "@/lib/trades/ideas";
import { rng, shuffle } from "@/lib/trades/ideas";
import type { ScoredTrade, TeamTradeStats } from "@/lib/trades/scored";
import { formatMoney } from "@/lib/format";

export type XPost = {
  id: string; // stable for the day (used to remember "posted")
  time: string; // suggested time, Eastern
  kind: string; // short label shown in the admin
  text: string;
  url: string | null; // link to the site page, added by X as a card
  length: number; // as X counts it (a link = 23 characters)
};

export type XPostInput = {
  today: string; // YYYY-MM-DD (Eastern)
  siteUrl: string;
  teams: TeamWithRoster[];
  players: ValuedPlayer[];
  trades: ScoredTrade[];
  stats: TeamTradeStats[];
  rosters: Map<string, number>; // team id -> Roster Score
  lastNight: Game[];
  tonight: Game[];
  ideas: TradeIdea[];
  news: NewsItem[];
};

export const X_LIMIT = 280;
const LINK = 23;
const MAX = 15;
// 15 slots, roughly one an hour from 9 AM to 11 PM Eastern (US fans).
const SLOTS = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM"];

const short = (t: { short_name: string | null; name: string }) => t.short_name ?? t.name;
const last = (name: string) => name.split(" ").slice(-1)[0];
// Team hashtag from its nickname: "Trail Blazers" -> #TrailBlazers.
const tag = (t: { short_name: string | null; name: string } | undefined) => (t ? `#${short(t).replace(/[^A-Za-z0-9]/g, "")}` : "");

// X's "post" intent: opens X with the text already written; the user just clicks Post.
export function intentUrl(p: Pick<XPost, "text" | "url">): string {
  // encodeURIComponent (spaces = %20), not URLSearchParams (spaces = "+", which some X apps keep as "+").
  return `https://x.com/intent/post?text=${encodeURIComponent(p.text)}${p.url ? `&url=${encodeURIComponent(p.url)}` : ""}`;
}

export function xPostsOfTheDay(input: XPostInput): XPost[] {
  const { today, siteUrl, players, trades, stats, rosters, lastNight, tonight, ideas, news, teams } = input;
  const rand = rng(`x-${today}`);
  const pickOne = <T,>(list: T[]): T | undefined => list[Math.floor(rand() * list.length)];
  const link = (path: string) => `${siteUrl}${path}`;
  const byAbbr = new Map(stats.map((s) => [s.team.abbreviation, s]));
  const teamByAbbr = new Map(teams.map((t) => [t.abbreviation, t]));
  const posts: Omit<XPost, "time" | "length">[] = [];
  const add = (id: string, kind: string, text: string, url: string | null) => posts.push({ id: `${today}-${id}`, kind, text, url });

  // 1. Morning: last night, did the better trader / better roster win?
  const finals = lastNight.filter((g) => g.state === "post");
  if (finals.length) {
    let judged = 0, right = 0;
    for (const g of finals) {
      const fav = favorite(g, byAbbr, teamByAbbr, rosters);
      if (!fav) continue;
      judged++;
      if (fav.winner) right++;
    }
    const upsets = finals.filter((g) => favorite(g, byAbbr, teamByAbbr, rosters)?.winner === false);
    const upset = upsets[0];
    add(
      "recap",
      "Last night",
      `Last night in the NBA: the team with the better front office won ${right} of ${judged} games.` +
        (upset ? `\n\nBiggest upset on paper: ${upset.away.name.split(" ").slice(-1)[0]} at ${upset.home.name.split(" ").slice(-1)[0]}.` : "") +
        `\n\nEvery score, graded 👇 #NBA`,
      link("/games"),
    );
  }

  // 2. Trade ideas of the day (one post each).
  for (const idea of ideas.slice(0, 3)) {
    const b = short(idea.buyer), s = short(idea.seller);
    add(
      `idea-${idea.target.id}`,
      "Trade idea",
      `TRADE IDEA 🔁\n\n${idea.target.name} to the ${b}?\n\n${b}: ${idea.buyerResult.score}/99 (${idea.buyerResult.tier})\n${s}: ${idea.sellerResult.score}/99 (${idea.sellerResult.tier})\n\nWould you do it? ${tag(idea.buyer)} ${tag(idea.seller)} #NBA`,
      link("/news"),
    );
  }

  // 3. Graded real trades: the latest one, a heist, a fleecing.
  const latest = trades[0];
  if (latest) {
    const lines = latest.teams.map((t) => `${short(t.team)}: ${t.score}/99 — ${t.tier}`).join("\n");
    add(
      `latest-${latest.id}`,
      "Latest trade",
      `WHO WON THE TRADE? 🧾\n\n${lines}\n\n${latest.winner ? `Our verdict: the ${short(latest.winner.team)} won it.` : "Our verdict: even trade."} Agree? #NBA`,
      link(`/trade/${latest.id}`),
    );
  }
  const sides = trades.flatMap((trade) => trade.teams.map((t) => ({ trade, t })));
  const heist = pickOne(sides.filter((x) => x.t.score >= 70).sort((a, b) => b.t.score - a.t.score).slice(0, 5));
  if (heist && heist.trade.id !== latest?.id) {
    add(
      `heist-${heist.trade.id}`,
      "Best trade",
      `${heist.t.score}/99. ${tierFor(heist.t.score).toUpperCase()}\n\nThe ${short(heist.t.team)} got ${heist.t.receives.slice(0, 3).join(", ")} — one of the best trades of the season so far.\n\n${tag(heist.t.team)} #NBA`,
      link(`/trade/${heist.trade.id}`),
    );
  }
  const fleeced = pickOne(sides.filter((x) => x.t.score <= 35).sort((a, b) => a.t.score - b.t.score).slice(0, 5));
  if (fleeced) {
    add(
      `fleeced-${fleeced.trade.id}`,
      "Worst trade",
      `Ouch. ${fleeced.t.score}/99 😬\n\nThe ${short(fleeced.t.team)} have one of the worst trade grades of the season. Did they get fleeced, or are we missing something?\n\n${tag(fleeced.t.team)} #NBA`,
      link(`/trade/${fleeced.trade.id}`),
    );
  }

  // 4. Players: a bargain contract and an overpaid one (rotating among the top 10).
  const signed = players.filter((p) => p.hasContract);
  const bargain = pickOne(signed.filter((p) => p.salary >= 5_000_000).slice(0, 10));
  if (bargain) {
    add(
      `bargain-${bargain.id}`,
      "Bargain",
      `BEST VALUE CONTRACTS 💰\n\n${bargain.name} (${bargain.team.abbreviation}) makes ${formatMoney(bargain.salary)} this season. His Trade Value: ${bargain.score}/99.\n\nOne of the best deals in the league. ${tag(bargain.team)} #NBA`,
      link(`/player/${bargain.slug}`),
    );
  }
  const overpaid = pickOne(
    [...signed].filter((p) => p.salary >= 15_000_000).sort((a, b) => a.value - b.value).slice(0, 10),
  );
  if (overpaid) {
    add(
      `overpaid-${overpaid.id}`,
      "Overpaid",
      `Hot take 🌶️\n\n${overpaid.name} is owed ${formatMoney(overpaid.totalRemaining)} over ${overpaid.yearsLeft} year${overpaid.yearsLeft > 1 ? "s" : ""}. Trade Value: ${overpaid.score}/99.\n\nWould anyone take that contract? ${tag(overpaid.team)} #NBA`,
      link(`/player/${overpaid.slug}`),
    );
  }

  // 5. Rosters: best and worst built.
  const ranked = [...teams].sort((a, b) => (rosters.get(b.id) ?? 50) - (rosters.get(a.id) ?? 50));
  if (ranked.length >= 3) {
    const top = ranked.slice(0, 3).map((t, i) => `${i + 1}. ${short(t)} — ${rosters.get(t.id)}`).join("\n");
    add("rosters", "Rankings", `BEST-BUILT ROSTERS IN THE NBA 🏗️\n\n${top}\n\nRoster Score = how good their contracts are, from 1 to 99. Where's your team? #NBA`, link("/teams"));
  }

  // 6. ESPN trade talk with our angle (a tagged player we can value).
  const byName = new Map(players.map((p) => [p.name, p]));
  const talk = shuffle(
    news.filter((n) => n.athletes.some((a) => byName.has(a)) && /trade|rumou?r|deadline|acquir|interest/i.test(`${n.headline} ${n.description}`)),
    rand,
  ).slice(0, 2);
  for (const n of talk) {
    const p = byName.get(n.athletes.find((a) => byName.has(a))!)!;
    add(
      `talk-${n.id}`,
      "Trade talk",
      `${n.headline.length > 110 ? `${n.headline.slice(0, 107)}…` : n.headline}\n\nOur number on ${p.name}: Trade Value ${p.score}/99 on ${formatMoney(p.salary)}.\n\n${tag(p.team)} #NBA`,
      link(`/player/${p.slug}`),
    );
  }

  // 7. Tonight: the two most interesting games (closest Roster Scores) with our pick.
  const pre = tonight.filter((g) => g.state === "pre");
  const close = [...pre]
    .map((g) => ({ g, gap: Math.abs((rosters.get(teamByAbbr.get(g.away.abbreviation)?.id ?? "") ?? 50) - (rosters.get(teamByAbbr.get(g.home.abbreviation)?.id ?? "") ?? 50)) }))
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 2);
  for (const { g } of close) {
    const fav = favorite(g, byAbbr, teamByAbbr, rosters);
    const a = last(g.away.name), h = last(g.home.name);
    add(
      `tonight-${g.id}`,
      "Tonight",
      `TONIGHT 🏀 ${a} at ${h} (${g.detail})\n\n${fav ? `The better front office on paper: ${last(fav.team.name)} (${fav.metric === "TS" ? "Trade Score" : "Roster Score"}).` : "Dead even on paper."}\n\nWho you got? ${tag(teamByAbbr.get(g.away.abbreviation))} ${tag(teamByAbbr.get(g.home.abbreviation))} #NBA`,
      link("/games"),
    );
  }

  // 8. Evening engagement: an older graded trade to debate.
  const debate = pickOne(trades.filter((t) => t.id !== latest?.id && t.id !== heist?.trade.id && t.id !== fleeced?.trade.id));
  if (debate) {
    const [a, b] = debate.teams;
    add(
      `debate-${debate.id}`,
      "Debate",
      `Be honest: who won this one? 🤔\n\n${short(a.team)} ${a.score} — ${b ? `${b.score} ${short(b.team)}` : ""}\n\nReply with your grade 👇 #NBA`,
      link(`/trade/${debate.id}`),
    );
  }

  // Order of the day: recap in the morning, ideas and grades during the day, tonight's games before tip-off.
  const order = ["Last night", "Trade idea", "Latest trade", "Bargain", "Best trade", "Trade talk", "Rankings", "Trade idea", "Overpaid", "Worst trade", "Tonight", "Trade talk", "Trade idea", "Debate"];
  const sorted: typeof posts = [];
  const pool = [...posts];
  for (const kind of order) {
    const i = pool.findIndex((p) => p.kind === kind);
    if (i >= 0) sorted.push(pool.splice(i, 1)[0]);
  }
  sorted.push(...pool);

  return sorted.slice(0, MAX).map((p, i) => ({ ...p, time: SLOTS[i], length: xLength(p.text, p.url) }));
}

// Length as X counts it: the link becomes a 23-character t.co link (plus a space).
export function xLength(text: string, url: string | null): number {
  return [...text].length + (url ? LINK + 1 : 0);
}

// The favorite on paper: better Trade Score when both teams have traded, else better Roster Score.
function favorite(g: Game, byAbbr: Map<string, TeamTradeStats>, teamByAbbr: Map<string, TeamWithRoster>, rosters: Map<string, number>) {
  const ta = byAbbr.get(g.away.abbreviation)?.average, th = byAbbr.get(g.home.abbreviation)?.average;
  if (ta !== undefined && th !== undefined && ta !== th) {
    const team = ta > th ? g.away : g.home;
    return { team, metric: "TS" as const, winner: team.winner };
  }
  const ra = rosters.get(teamByAbbr.get(g.away.abbreviation)?.id ?? ""), rh = rosters.get(teamByAbbr.get(g.home.abbreviation)?.id ?? "");
  if (ra !== undefined && rh !== undefined && ra !== rh) {
    const team = ra > rh ? g.away : g.home;
    return { team, metric: "RS" as const, winner: team.winner };
  }
  return null;
}
