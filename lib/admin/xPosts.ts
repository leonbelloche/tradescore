// "Posts of the day" for the Trade Score social accounts: ready-to-post texts built from the site's own data
// (graded trades, last night's games, tonight's games, trade ideas, player values, ESPN trade talk),
// each with the image that goes with it. Same posts all day, new ones every day (the date seeds the choices).
import type { TeamWithRoster } from "@/lib/db/teams";
import type { Game } from "@/lib/nba/scoreboard";
import type { NewsItem } from "@/lib/nba/news";
import type { ValuedPlayer } from "@/lib/players/values";
import type { TradeIdea } from "@/lib/trades/ideas";
import { rng, shuffle } from "@/lib/trades/ideas";
import type { ScoredTrade, TeamTradeStats } from "@/lib/trades/scored";
import { formatMoney } from "@/lib/format";

// The image that goes with a post: a trade card, or a "stat" card (see lib/cards).
export type CardSpec =
  | { type: "trade"; id: string; line?: string }
  | { type: "stat"; kicker: string; title: string; sub?: string; meta?: string[]; big?: number; bigLabel?: string; photo?: string | null; logo?: string | null; list?: string[] };

export type XPost = {
  id: string; // stable for the day (used to remember "posted")
  time: string; // suggested time, Eastern ("9:00 AM")
  hour: number; // same, 0-23, to know if a post is late
  kind: string; // short label shown in the admin
  text: string;
  url: string | null; // link to the site page, added by X as a card
  length: number; // as X counts it (a link = 23 characters)
  card: CardSpec;
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
export const POSTS_PER_DAY = 15;
const LINK = 23;
// 15 slots, roughly one an hour from 9 AM to 11 PM Eastern (US fans).
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const label = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;

const short = (t: { short_name: string | null; name: string }) => t.short_name ?? t.name;
const last = (name: string) => name.split(" ").slice(-1)[0];
// Team hashtag from its nickname: "Trail Blazers" -> #TrailBlazers.
const tag = (t: { short_name: string | null; name: string } | undefined) => (t ? `#${short(t).replace(/[^A-Za-z0-9]/g, "")}` : "");
// Plain-English verdict on a player's contract from his Trade Value.
export const valueLabel = (score: number) => (score >= 80 ? "Steal of a contract" : score >= 60 ? "Bargain" : score >= 41 ? "Fair price" : score >= 21 ? "Overpaid" : "Albatross contract");

// X's "post" intent: opens X with the text already written; the user just clicks Post.
export function intentUrl(p: Pick<XPost, "text" | "url">): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(p.text)}${p.url ? `&url=${encodeURIComponent(p.url)}` : ""}`;
}

export function xPostsOfTheDay(input: XPostInput): XPost[] {
  const { today, siteUrl, players, trades, stats, rosters, lastNight, tonight, ideas, news, teams } = input;
  const rand = rng(`x-${today}`);
  const pickOne = <T,>(list: T[]): T | undefined => list[Math.floor(rand() * list.length)];
  const link = (path: string) => `${siteUrl}${path}`;
  const byAbbr = new Map(stats.map((s) => [s.team.abbreviation, s]));
  const teamByAbbr = new Map(teams.map((t) => [t.abbreviation, t]));
  const posts: Omit<XPost, "time" | "hour" | "length">[] = [];
  const add = (id: string, kind: string, text: string, url: string | null, card: CardSpec) => posts.push({ id: `${today}-${id}`, kind, text, url, card });

  // 1. Morning: last night, did the better-built team win?
  const finals = lastNight.filter((g) => g.state === "post");
  if (finals.length) {
    let judged = 0, right = 0;
    for (const g of finals) {
      const fav = favorite(g, byAbbr, teamByAbbr, rosters);
      if (!fav) continue;
      judged++;
      if (fav.winner) right++;
    }
    const upset = finals.find((g) => favorite(g, byAbbr, teamByAbbr, rosters)?.winner === false);
    const upsetLine = upset ? `\n\nBiggest upset on paper: the ${last((upset.away.winner ? upset.away : upset.home).name)} beat the better-built ${last((upset.away.winner ? upset.home : upset.away).name)}.` : "";
    add(
      "recap",
      "Last night",
      `Front offices went ${right}-${judged - right} last night. 🏀\n\nThe team with the better-built roster won ${right} of ${judged} games.${upsetLine}\n\nEvery score, graded 👇 #NBA`,
      link("/games"),
      {
        type: "stat",
        kicker: "Last night",
        title: `Front offices went ${right}-${judged - right}`,
        list: finals.slice(0, 5).map((g) => `${g.away.abbreviation} ${g.away.score ?? ""}  ${g.home.abbreviation} ${g.home.score ?? ""}${favorite(g, byAbbr, teamByAbbr, rosters)?.winner === false ? "  · upset" : ""}`),
      },
    );
  }

  // 2. Trade ideas of the day (one post each).
  for (const idea of ideas.slice(0, 3)) {
    const b = short(idea.buyer), s = short(idea.seller);
    add(
      `idea-${idea.target.id}`,
      "Trade idea",
      `What if the ${b} called about ${idea.target.name}? 📞\n\nWe ran the numbers:\n${b} ${idea.buyerResult.score} · ${idea.buyerResult.tier}\n${s} ${idea.sellerResult.score} · ${idea.sellerResult.tier}\n\nDo you make that deal? ${tag(idea.buyer)} ${tag(idea.seller)} #NBA`,
      link("/news"),
      {
        type: "stat",
        kicker: "Trade idea",
        title: `${idea.target.name} to the ${b}?`,
        sub: `${b}: ${idea.buyerResult.tier}`,
        meta: [`${s}: ${idea.sellerResult.score}/99`, `${formatMoney(idea.target.salary)} this season`],
        big: idea.buyerResult.score,
        bigLabel: `${b} grade`,
        photo: idea.target.headshotUrl,
        logo: idea.buyer.logo_url,
      },
    );
  }

  // 3. Graded real trades: the latest one, a heist, a fleecing, one to debate.
  const latest = trades[0];
  if (latest) {
    const lines = latest.teams.map((t) => `${short(t.team)} ${t.score} · ${t.tier}`).join("\n");
    add(
      `latest-${latest.id}`,
      "Latest trade",
      `Who won the trade? 🧾\n\n${lines}\n\n${latest.winner ? `The ${short(latest.winner.team)} did. Change our mind.` : "Nobody. Dead even."} #NBA`,
      link(`/trade/${latest.id}`),
      { type: "trade", id: latest.id, line: latest.winner ? `Advantage ${short(latest.winner.team)}.` : "Dead even." },
    );
  }
  const sides = trades.flatMap((trade) => trade.teams.map((t) => ({ trade, t })));
  const heist = pickOne(sides.filter((x) => x.t.score >= 70).sort((a, b) => b.t.score - a.t.score).slice(0, 5));
  if (heist && heist.trade.id !== latest?.id) {
    const other = heist.trade.teams.find((x) => x.team.id !== heist.t.team.id);
    add(
      `heist-${heist.trade.id}`,
      "Best trade",
      `${heist.t.score}/99. That's a robbery. 🚨\n\nThe ${short(heist.t.team)} got ${heist.t.receives.slice(0, 2).join(" and ")}${other ? ` from the ${short(other.team)}` : ""}. One of the best trades of the season.\n\n${tag(heist.t.team)} #NBA`,
      link(`/trade/${heist.trade.id}`),
      { type: "trade", id: heist.trade.id, line: `${short(heist.t.team)}: ${heist.t.score}/99. Robbery.` },
    );
  }
  const fleeced = pickOne(sides.filter((x) => x.t.score <= 35).sort((a, b) => a.t.score - b.t.score).slice(0, 5));
  if (fleeced) {
    add(
      `fleeced-${fleeced.trade.id}`,
      "Worst trade",
      `${fleeced.t.score}/99. Somebody check on the ${short(fleeced.t.team)}. 😬\n\nOne of the worst trade grades of the season. Fleeced, or are we missing something?\n\n${tag(fleeced.t.team)} #NBA`,
      link(`/trade/${fleeced.trade.id}`),
      { type: "trade", id: fleeced.trade.id, line: `${short(fleeced.t.team)}: ${fleeced.t.score}/99. Ouch.` },
    );
  }

  // 4. Players: a bargain contract and an overpaid one (rotating among the top 10).
  const signed = players.filter((p) => p.hasContract);
  const bargain = pickOne(signed.filter((p) => p.salary >= 5_000_000).slice(0, 10));
  if (bargain) {
    add(
      `bargain-${bargain.id}`,
      "Bargain",
      `The best contract in the NBA? 💰\n\n${bargain.name} makes ${formatMoney(bargain.salary)} this season. His Trade Value: ${bargain.score}/99.\n\nThe ${short(bargain.team)} are getting a steal. ${tag(bargain.team)} #NBA`,
      link(`/player/${bargain.slug}`),
      {
        type: "stat",
        kicker: "Best contracts",
        title: bargain.name,
        sub: valueLabel(bargain.score),
        meta: [short(bargain.team), `${formatMoney(bargain.salary)} a year`, `${bargain.yearsLeft} yr${bargain.yearsLeft > 1 ? "s" : ""} left`],
        big: bargain.score,
        bigLabel: "Trade Value",
        photo: bargain.headshotUrl,
        logo: bargain.team.logo_url,
      },
    );
  }
  const overpaid = pickOne([...signed].filter((p) => p.salary >= 15_000_000).sort((a, b) => a.value - b.value).slice(0, 10));
  if (overpaid) {
    add(
      `overpaid-${overpaid.id}`,
      "Overpaid",
      `Hot take 🌶️\n\n${overpaid.name} is owed ${formatMoney(overpaid.totalRemaining)} over the next ${overpaid.yearsLeft} year${overpaid.yearsLeft > 1 ? "s" : ""}. Trade Value: ${overpaid.score}/99.\n\nWho's taking that contract? ${tag(overpaid.team)} #NBA`,
      link(`/player/${overpaid.slug}`),
      {
        type: "stat",
        kicker: "Hot take",
        title: overpaid.name,
        sub: valueLabel(overpaid.score),
        meta: [short(overpaid.team), `owed ${formatMoney(overpaid.totalRemaining)}`, `${overpaid.yearsLeft} yr${overpaid.yearsLeft > 1 ? "s" : ""} left`],
        big: overpaid.score,
        bigLabel: "Trade Value",
        photo: overpaid.headshotUrl,
        logo: overpaid.team.logo_url,
      },
    );
  }

  // 5. Rosters: best built.
  const ranked = [...teams].sort((a, b) => (rosters.get(b.id) ?? 50) - (rosters.get(a.id) ?? 50));
  if (ranked.length >= 3) {
    const top = ranked.slice(0, 3).map((t, i) => `${i + 1}. ${short(t)} ${rosters.get(t.id)}`).join("\n");
    add(
      "rosters",
      "Rankings",
      `The best-built rosters in the NBA right now 🏗️\n\n${top}\n\nRoster Score = how good their contracts are, 1 to 99. Where's your team? #NBA`,
      link("/teams"),
      { type: "stat", kicker: "Roster Score", title: "Best-built rosters", logo: ranked[0].logo_url, list: ranked.slice(0, 5).map((t) => `${short(t)}  ${rosters.get(t.id)}`) },
    );
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
      `${n.headline.length > 110 ? `${n.headline.slice(0, 107)}…` : n.headline}\n\nBefore you trade for him: ${p.name}'s Trade Value is ${p.score}/99 on ${formatMoney(p.salary)}. ${valueLabel(p.score)}.\n\n${tag(p.team)} #NBA`,
      link(`/player/${p.slug}`),
      {
        type: "stat",
        kicker: "Trade talk",
        title: p.name,
        sub: valueLabel(p.score),
        meta: [short(p.team), `${formatMoney(p.salary)} a year`],
        big: p.score,
        bigLabel: "Trade Value",
        photo: p.headshotUrl,
        logo: p.team.logo_url,
      },
    );
  }

  // 7. Tonight: the two most interesting games (closest Roster Scores) with our pick.
  const pre = tonight.filter((g) => g.state === "pre");
  const rsOf = (abbr: string) => rosters.get(teamByAbbr.get(abbr)?.id ?? "") ?? 50;
  const close = [...pre].map((g) => ({ g, gap: Math.abs(rsOf(g.away.abbreviation) - rsOf(g.home.abbreviation)) })).sort((a, b) => a.gap - b.gap).slice(0, 2);
  for (const { g } of close) {
    const fav = favorite(g, byAbbr, teamByAbbr, rosters);
    const a = last(g.away.name), h = last(g.home.name);
    const favTeam = fav ? teamByAbbr.get(fav.team.abbreviation) : undefined;
    add(
      `tonight-${g.id}`,
      "Tonight",
      `Tonight: ${a} at ${h} 🏀 (${g.detail})\n\n${fav ? `On paper, the ${last(fav.team.name)} have the better front office.` : "Dead even on paper."} Upset alert?\n\n${tag(teamByAbbr.get(g.away.abbreviation))} ${tag(teamByAbbr.get(g.home.abbreviation))} #NBA`,
      link("/games"),
      {
        type: "stat",
        kicker: "Tonight",
        title: `${a} at ${h}`,
        sub: fav ? `Edge: ${last(fav.team.name)}` : "Dead even",
        meta: [g.detail, `${a} ${rsOf(g.away.abbreviation)} vs ${h} ${rsOf(g.home.abbreviation)} (Roster Score)`],
        big: favTeam ? rsOf(favTeam.abbreviation) : undefined,
        bigLabel: "Roster Score",
        logo: favTeam?.logo_url ?? null,
      },
    );
  }

  // 8. Evening engagement: an older graded trade to debate.
  const debate = pickOne(trades.filter((t) => t.id !== latest?.id && t.id !== heist?.trade.id && t.id !== fleeced?.trade.id));
  if (debate) {
    const [a, b] = debate.teams;
    add(
      `debate-${debate.id}`,
      "Debate",
      `Be honest: who won this one? 🤔\n\n${short(a.team)} ${a.score}${b ? ` · ${short(b.team)} ${b.score}` : ""}\n\nReply with your grade 👇 #NBA`,
      link(`/trade/${debate.id}`),
      { type: "trade", id: debate.id, line: "Who won this one?" },
    );
  }

  // Order of the day: recap in the morning, ideas and grades during the day, tonight's games before tip-off.
  const order = ["Last night", "Trade idea", "Latest trade", "Bargain", "Best trade", "Trade talk", "Rankings", "Trade idea", "Overpaid", "Worst trade", "Tonight", "Trade talk", "Trade idea", "Tonight", "Debate"];
  const sorted: typeof posts = [];
  const pool = [...posts];
  for (const kind of order) {
    const i = pool.findIndex((p) => p.kind === kind);
    if (i >= 0) sorted.push(pool.splice(i, 1)[0]);
  }
  sorted.push(...pool);

  return sorted.slice(0, POSTS_PER_DAY).map((p, i) => ({ ...p, time: label(HOURS[i]), hour: HOURS[i], length: xLength(p.text, p.url) }));
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
