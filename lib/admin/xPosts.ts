// "Posts of the day" for the Trade Score X account: ready-to-post texts built from the site's own data
// (graded trades, last night's games, tonight's games, trade ideas, player values, ESPN trade talk),
// each with the image that goes with it. Same posts all day, new ones every day (the date seeds the choices).
//
// What works on X (and what we do):
// - A hook in the first line, short lines, a number people can argue with, a question at the end to get replies.
// - No link in the post itself: the post stands on its own; the site link goes in a reply under it
//   (and via the API a post with a link costs ~13x more).
// - 1 hashtag max, several wordings for each kind of post so two days never read the same (X hides duplicates).
import type { TeamWithRoster } from "@/lib/db/teams";
import type { Game } from "@/lib/nba/scoreboard";
import type { NewsItem } from "@/lib/nba/news";
import type { ValuedPlayer } from "@/lib/players/values";
import type { TradeIdea } from "@/lib/trades/ideas";
import { rng, shuffle } from "@/lib/trades/ideas";
import type { ScoredTrade, TeamTradeStats } from "@/lib/trades/scored";
import { formatMoney } from "@/lib/format";
import { X_POSTS_PER_DAY } from "@/lib/social/limits";

// The image that goes with a post: a trade card, or a "stat" card (see lib/cards).
export type CardSpec =
  | { type: "trade"; id: string; line?: string }
  | { type: "stat"; kicker: string; title: string; sub?: string; meta?: string[]; big?: number; bigLabel?: string; photo?: string | null; logo?: string | null; list?: string[] };

export type XPost = {
  id: string; // stable for the day (used to remember "posted")
  time: string; // suggested time, Eastern ("9:00 AM")
  hour: number; // same, 0-23, to know if a post is late
  kind: string; // short label shown in the admin
  text: string; // the post, without any link
  url: string | null; // page of the site, to put in a reply under the post (never in the post)
  length: number; // as X counts it
  card: CardSpec;
};

// A conversation to join: search X for it, then reply with our numbers.
export type ReplyIdea = {
  id: string;
  topic: string; // what people are talking about
  search: string; // X search link (latest posts on the topic)
  reply: string; // ready-to-paste reply (no link)
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
export const POSTS_PER_DAY = X_POSTS_PER_DAY; // see lib/social/limits.ts (anti-spam)
// Posting slots, Eastern (US fans): with 3 posts, morning, afternoon and evening before tip-off.
// More slots are used only if the daily limit grows (lib/social/limits.ts).
const HOURS = [10, 14, 18, 12, 16, 20, 9, 13, 15, 21].slice(0, Math.min(10, POSTS_PER_DAY)).sort((a, b) => a - b);
const label = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;

const short = (t: { short_name: string | null; name: string }) => t.short_name ?? t.name;
const surname = (name: string) => {
  const parts = name.split(" ").filter((p) => !/^(Jr\.?|Sr\.?|II|III|IV)$/.test(p));
  return parts[parts.length - 1] ?? name;
};
const last = surname;
// Name for a title on an image: the last name when the full name is long.
const cardName = (name: string) => (name.length > 16 ? surname(name) : name);
// What a team got, without filler like "Draft considerations" (reads badly in a post).
const gotList = (receives: string[]) => receives.filter((r) => !/^Draft considerations/i.test(r));
// Team hashtag from its nickname: "Trail Blazers" -> #TrailBlazers.
const tag = (t: { short_name: string | null; name: string } | undefined) => (t ? `#${short(t).replace(/[^A-Za-z0-9]/g, "")}` : "#NBA");
// Plain-English verdict on a player's contract from his Trade Value.
export const valueLabel = (score: number) => (score >= 80 ? "Steal of a contract" : score >= 60 ? "Bargain" : score >= 41 ? "Fair price" : score >= 21 ? "Overpaid" : "Albatross contract");

// Reply under a post: the link to the full breakdown.
export const replyWithLink = (url: string) => `Full breakdown, every number explained 👉 ${url}`;

// X's "post" intent: opens X with the text already written; the user just clicks Post. No link in the post.
export function intentUrl(p: Pick<XPost, "text">): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(p.text)}`;
}

export function xPostsOfTheDay(input: XPostInput): XPost[] {
  const { today, siteUrl, players, trades, stats, rosters, lastNight, tonight, ideas, news, teams } = input;
  const rand = rng(`x-${today}`);
  const pickOne = <T,>(list: T[]): T | undefined => list[Math.floor(rand() * list.length)];
  // One of several wordings, so the account never posts the same sentence two days in a row.
  const say = (...variants: string[]) => variants[Math.floor(rand() * variants.length)];
  const link = (path: string) => `${siteUrl}${path}`;
  const byAbbr = new Map(stats.map((s) => [s.team.abbreviation, s]));
  const teamByAbbr = new Map(teams.map((t) => [t.abbreviation, t]));
  const posts: Omit<XPost, "time" | "hour" | "length">[] = [];
  const add = (id: string, kind: string, text: string, url: string | null, card: CardSpec) =>
    posts.push({ id: `${today}-${id}`, kind, text: text.replace(/\n{3,}/g, "\n\n").trim(), url, card });

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
    const winnerOf = (g: Game) => (g.away.winner ? g.away : g.home);
    const loserOf = (g: Game) => (g.away.winner ? g.home : g.away);
    const upsetLine = upset ? `\n\nBiggest upset on paper: ${last(winnerOf(upset).name)} over the better-built ${last(loserOf(upset).name)}.` : "";
    add(
      "recap",
      "Last night",
      say(
        `The better-built roster won ${right} of ${judged} games last night.${upsetLine}\n\nFront offices matter. Or do they?`,
        `Front offices went ${right}-${judged - right} last night 🏀${upsetLine}\n\nWhich result surprised you most?`,
        `${right}/${judged}.\n\nThat's how often the team with the better contracts won last night.${upsetLine}\n\nLuck or roster building?`,
      ),
      link("/games"),
      {
        type: "stat",
        kicker: "Last night",
        title: `Better roster won ${right} of ${judged}`,
        list: finals.slice(0, 5).map((g) => `${g.away.abbreviation} ${g.away.score ?? ""} - ${g.home.score ?? ""} ${g.home.abbreviation}${favorite(g, byAbbr, teamByAbbr, rosters)?.winner === false ? "  upset" : ""}`),
      },
    );
  }

  // 2. Trade ideas of the day (one post each): a question people want to answer.
  for (const idea of ideas.slice(0, 3)) {
    const b = short(idea.buyer), s = short(idea.seller);
    const p = idea.target;
    const gives = idea.buyerResult.sent.map((d) => d.label).slice(0, 3).join(", ");
    add(
      `idea-${p.id}`,
      "Trade idea",
      say(
        `Our trade idea (not a rumor):\n${b} get ${p.name}.\n${s} get ${gives}.\n\nOur grades:\n${b} ${idea.buyerResult.score}/99\n${s} ${idea.sellerResult.score}/99\n\nWho says no? ${tag(idea.buyer)}`,
        `Trade idea (ours, not a rumor) 📞\n\n${p.name} to the ${b} for ${gives}.\n\n${b}: ${idea.buyerResult.tier} (${idea.buyerResult.score})\n${s}: ${idea.sellerResult.tier} (${idea.sellerResult.score})\n\nSmash or pass? ${tag(idea.buyer)}`,
        `Hypothetical: if you're the ${s}, do you take ${gives} for ${p.name}?\n\nWe graded it: ${s} ${idea.sellerResult.score}/99, ${b} ${idea.buyerResult.score}/99.\n\nYes or no? ${tag(idea.seller)}`,
      ),
      link("/news"),
      {
        type: "stat",
        kicker: "Trade idea",
        title: `${cardName(p.name)} to the ${b}?`,
        sub: `${b}: ${idea.buyerResult.tier}`,
        meta: [`${s} ${idea.sellerResult.score}/99`, `${formatMoney(p.salary)} this season`],
        big: idea.buyerResult.score,
        bigLabel: `${b} grade`,
        photo: p.headshotUrl,
        logo: idea.buyer.logo_url,
      },
    );
  }

  // 3. Graded real trades: the latest one, a heist, a fleecing, one to debate.
  const latest = trades[0];
  if (latest) {
    const lines = latest.teams.map((t) => `${short(t.team)}: ${t.score}/99 (${t.tier})`).join("\n");
    const w = latest.winner ? short(latest.winner.team) : null;
    add(
      `latest-${latest.id}`,
      "Latest trade",
      say(
        `Who won the ${latest.teams.map((t) => short(t.team)).join("-")} trade?\n\n${lines}\n\n${w ? `We say the ${w}. Change our mind.` : "Dead even. Prove us wrong."}`,
        `We graded the latest NBA trade 🧾\n\n${lines}\n\n${w ? `Advantage ${w}.` : "Nobody wins this one."} Agree?`,
      ),
      link(`/trade/${latest.id}`),
      { type: "trade", id: latest.id, line: w ? `Advantage ${w}.` : "Dead even." },
    );
  }
  const sides = trades.flatMap((trade) => trade.teams.map((t) => ({ trade, t })));
  const heist = pickOne(sides.filter((x) => x.t.score >= 70).sort((a, b) => b.t.score - a.t.score).slice(0, 5));
  if (heist && heist.trade.id !== latest?.id) {
    const other = heist.trade.teams.find((x) => x.team.id !== heist.t.team.id);
    const got = gotList(heist.t.receives).slice(0, 2).join(" and ");
    add(
      `heist-${heist.trade.id}`,
      "Best trade",
      say(
        `${heist.t.score}/99.\n\nThe ${short(heist.t.team)} got ${got}${other ? ` and the ${short(other.team)} let it happen` : ""}.\n\nBest trade of the season so far? ${tag(heist.t.team)}`,
        `Robbery of the season? 🚨\n\n${short(heist.t.team)} land ${got}. Our grade: ${heist.t.score}/99.${other ? `\n${short(other.team)}: ${other.score}/99.` : ""}\n\nName a better one.`,
      ),
      link(`/trade/${heist.trade.id}`),
      { type: "trade", id: heist.trade.id, line: `${short(heist.t.team)} ${heist.t.score}/99. Robbery.` },
    );
  }
  const fleeced = pickOne(sides.filter((x) => x.t.score <= 35).sort((a, b) => a.t.score - b.t.score).slice(0, 5));
  if (fleeced) {
    add(
      `fleeced-${fleeced.trade.id}`,
      "Worst trade",
      say(
        `${fleeced.t.score}/99. Somebody check on the ${short(fleeced.t.team)} front office 😬\n\nWorst trade grade of the season, or are we missing something? ${tag(fleeced.t.team)}`,
        `${short(fleeced.t.team)} fans, explain this one to us.\n\nOur grade: ${fleeced.t.score}/99. ${fleeced.t.tier}.\n\nWhat's the plan here? ${tag(fleeced.t.team)}`,
      ),
      link(`/trade/${fleeced.trade.id}`),
      { type: "trade", id: fleeced.trade.id, line: `${short(fleeced.t.team)} ${fleeced.t.score}/99. Ouch.` },
    );
  }

  // 4. Players: a bargain contract and an overpaid one (rotating among the top 10, healthy players only).
  const signed = players.filter((p) => p.hasContract && p.availability >= 0.6);
  const bargain = pickOne(signed.filter((p) => p.salary >= 5_000_000).slice(0, 10));
  if (bargain) {
    add(
      `bargain-${bargain.id}`,
      "Bargain",
      say(
        `Best contract in the NBA? 💰\n\n${bargain.name}: ${formatMoney(bargain.salary)} this season.\nTrade Value: ${bargain.score}/99.\n\nName a better deal. ${tag(bargain.team)}`,
        `The ${short(bargain.team)} pay ${bargain.name} ${formatMoney(bargain.salary)} a year.\n\nHe's worth way more. Trade Value: ${bargain.score}/99.\n\nMost underpaid player in the league?`,
      ),
      link(`/player/${bargain.slug}`),
      {
        type: "stat",
        kicker: "Best contracts",
        title: cardName(bargain.name),
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
    const yrs = `${overpaid.yearsLeft} year${overpaid.yearsLeft > 1 ? "s" : ""}`;
    add(
      `overpaid-${overpaid.id}`,
      "Overpaid",
      say(
        `Unpopular opinion 🌶️\n\n${overpaid.name} is owed ${formatMoney(overpaid.totalRemaining)} over ${yrs}. Our Trade Value: ${overpaid.score}/99.\n\nWould your team take that contract?`,
        `${formatMoney(overpaid.totalRemaining)} left on ${overpaid.name}'s deal.\n\nTrade Value: ${overpaid.score}/99. ${valueLabel(overpaid.score)}.\n\nToo harsh? ${tag(overpaid.team)}`,
      ),
      link(`/player/${overpaid.slug}`),
      {
        type: "stat",
        kicker: "Hot take",
        title: cardName(overpaid.name),
        sub: valueLabel(overpaid.score),
        meta: [short(overpaid.team), `owed ${formatMoney(overpaid.totalRemaining)}`, `${yrs} left`],
        big: overpaid.score,
        bigLabel: "Trade Value",
        photo: overpaid.headshotUrl,
        logo: overpaid.team.logo_url,
      },
    );
  }

  // 5. Rosters: best built (a ranking people share to defend their team).
  const ranked = [...teams].sort((a, b) => (rosters.get(b.id) ?? 50) - (rosters.get(a.id) ?? 50));
  if (ranked.length >= 5) {
    const top = ranked.slice(0, 5).map((t, i) => `${i + 1}. ${short(t)} ${rosters.get(t.id)}`).join("\n");
    add(
      "rosters",
      "Rankings",
      say(`Best-built rosters in the NBA right now 🏗️\n\n${top}\n\nWho's missing?`, `We graded every contract in the league. Top 5 rosters:\n\n${top}\n\nWhere's your team?`),
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
      say(
        `Everyone's talking about ${p.name}.\n\nBefore your team calls: ${formatMoney(p.salary)} this season, Trade Value ${p.score}/99. ${valueLabel(p.score)}.\n\nWorth it? ${tag(p.team)}`,
        `${p.name} trade talk is heating up 🔥\n\nOur numbers: Trade Value ${p.score}/99 on ${formatMoney(p.salary)}.\n\nBuy or sell?`,
      ),
      link(`/player/${p.slug}`),
      {
        type: "stat",
        kicker: "Trade talk",
        title: cardName(p.name),
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
      say(
        `${a} at ${h} tonight (${g.detail}).\n\n${fav ? `On paper, the ${last(fav.team.name)} are better built.` : "Dead even on paper."}\n\nWho you got?`,
        `Tonight: ${a} vs ${h} 🏀\n\nRoster Score: ${a} ${rsOf(g.away.abbreviation)}, ${h} ${rsOf(g.home.abbreviation)}.\n\nUpset alert or easy win?`,
      ),
      link("/games"),
      {
        type: "stat",
        kicker: "Tonight",
        title: `${a} at ${h}`,
        sub: fav ? `Edge: ${last(fav.team.name)}` : "Dead even",
        meta: [g.detail, `Roster Score ${rsOf(g.away.abbreviation)} vs ${rsOf(g.home.abbreviation)}`],
        big: favTeam ? rsOf(favTeam.abbreviation) : undefined,
        bigLabel: "Roster Score",
        logo: favTeam?.logo_url ?? null,
      },
    );
  }

  // 8. Evening engagement: an older graded trade to vote on.
  const debate = pickOne(trades.filter((t) => t.id !== latest?.id && t.id !== heist?.trade.id && t.id !== fleeced?.trade.id));
  if (debate) {
    const [a, b] = debate.teams;
    const gotA = gotList(a.receives).slice(0, 2).join(", ") || "cash";
    const gotB = b ? gotList(b.receives).slice(0, 2).join(", ") || "cash" : "";
    add(
      `debate-${debate.id}`,
      "Debate",
      say(
        `Be honest: who won this one? 🤔\n\n${short(a.team)} got ${gotA}.${b ? `\n${short(b.team)} got ${gotB}.` : ""}\n\nReply with your grade, we'll reveal ours.`,
        `Grade this trade from 1 to 99 👇\n\n${short(a.team)} get ${gotA}${b ? `\n${short(b.team)} get ${gotB}` : ""}\n\nOur answer tonight.`,
      ),
      link(`/trade/${debate.id}`),
      { type: "trade", id: debate.id, line: "Who won this one?" },
    );
  }

  // Order of the day: recap in the morning, ideas and grades during the day, tonight's games before tip-off.
  // (10 a day max: the less useful ones are dropped first)
  // The best 3 first (a trade idea, a real trade, tonight's game), then the rest if the limit grows.
  const order = ["Trade idea", "Best trade", "Tonight", "Last night", "Latest trade", "Bargain", "Trade talk", "Overpaid", "Worst trade", "Debate", "Rankings", "Trade idea", "Trade talk", "Tonight", "Trade idea"];
  const sorted: typeof posts = [];
  const pool = [...posts];
  for (const kind of order) {
    const i = pool.findIndex((p) => p.kind === kind);
    if (i >= 0) sorted.push(pool.splice(i, 1)[0]);
  }
  sorted.push(...pool);

  // A morning recap goes first, tonight's game last, the rest in between.
  const chosen = sorted.slice(0, POSTS_PER_DAY);
  const slot = (k: string) => (k === "Last night" ? 0 : k === "Tonight" ? 2 : 1);
  chosen.sort((a, b) => slot(a.kind) - slot(b.kind));
  return chosen.map((p, i) => ({ ...p, time: label(HOURS[i]), hour: HOURS[i], length: xLength(p.text) }));
}

// Conversations to join today: players and games people are posting about, with a reply that adds our numbers.
// Replying to bigger accounts is how a new account gets seen. Written from our data, posted by you (never automatic).
export function replyIdeasOfTheDay(input: XPostInput): ReplyIdea[] {
  const { today, players, trades, tonight, news, rosters, teams } = input;
  const rand = rng(`replies-${today}`);
  const say = (...variants: string[]) => variants[Math.floor(rand() * variants.length)];
  const search = (q: string) => `https://x.com/search?q=${encodeURIComponent(q)}&f=live`;
  const byName = new Map(players.map((p) => [p.name, p]));
  const teamByAbbr = new Map(teams.map((t) => [t.abbreviation, t]));
  const out: ReplyIdea[] = [];

  // Players in today's ESPN news.
  const named = [...new Set(news.flatMap((n) => n.athletes))].map((n) => byName.get(n)).filter((p): p is ValuedPlayer => !!p && p.hasContract && p.salary >= 8_000_000 && (p.score >= 65 || p.score <= 35)); // only players worth an opinion
  for (const p of shuffle(named, rand).slice(0, 8)) {
    out.push({
      id: `${today}-reply-${p.id}`,
      topic: `${p.name} (dans l'actu aujourd'hui)`,
      search: search(`"${p.name}" min_faves:50`),
      reply: say(
        `For context: ${p.name} is at ${formatMoney(p.salary)} this season and grades ${p.score}/99 in Trade Value. ${valueLabel(p.score)}.`,
        `Numbers say ${p.score}/99 in trade value on ${formatMoney(p.salary)}. ${p.score >= 60 ? "Teams should be calling." : p.score <= 40 ? "Hard contract to move." : "Fair deal, nothing more."}`,
      ),
    });
  }

  // Tonight's games.
  for (const g of tonight.filter((x) => x.state === "pre").slice(0, 6)) {
    const a = teamByAbbr.get(g.away.abbreviation), h = teamByAbbr.get(g.home.abbreviation);
    if (!a || !h) continue;
    const ra = rosters.get(a.id) ?? 50, rh = rosters.get(h.id) ?? 50;
    out.push({
      id: `${today}-reply-game-${g.id}`,
      topic: `${short(a)} - ${short(h)} ce soir`,
      search: search(`${short(a)} ${short(h)} min_faves:20`),
      reply: `On paper: ${short(a)} Roster Score ${ra}, ${short(h)} ${rh}. ${ra === rh ? "Coin flip." : `Edge ${ra > rh ? short(a) : short(h)}.`} Let's see if it holds tonight.`,
    });
  }

  // The latest real trade.
  const t = trades[0];
  if (t) {
    out.push({
      id: `${today}-reply-trade-${t.id}`,
      topic: `Le trade ${t.teams.map((x) => short(x.team)).join("-")}`,
      search: search(`${t.teams.map((x) => short(x.team)).join(" ")} trade`),
      reply: `We graded it: ${t.teams.map((x) => `${short(x.team)} ${x.score}/99`).join(", ")}. ${t.winner ? `${short(t.winner.team)} won this one.` : "Even trade."}`,
    });
  }
  return out;
}

// Length as X counts it (no link in our posts).
export function xLength(text: string): number {
  return [...text].length;
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
