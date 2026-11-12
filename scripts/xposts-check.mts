// Dev check: prints today's X posts from the real database, plus ESPN games and news when they load.
// Run: npx tsx --env-file=.env.local scripts/xposts-check.mts
import { xPostsOfTheDay } from "@/lib/admin/xPosts";
import { forChannel } from "@/lib/social/channels";
import { getValuedPlayers, rosterScores } from "@/lib/players/values";
import { tradeIdeas } from "@/lib/trades/ideas";
import { getScoredTrades, teamStats } from "@/lib/trades/scored";

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const ymd = (shift: number) => {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + shift);
  return d.toISOString().slice(0, 10).replaceAll("-", "");
};
type EspnTeam = { homeAway: string; score?: string; winner?: boolean; team: { abbreviation: string; displayName: string } };
async function games(day: string) {
  const j = (await (await fetch(`${ESPN}/scoreboard?dates=${day}`)).json()) as { events?: { id: string; date: string; status: { type: { state: "pre" | "in" | "post"; shortDetail: string } }; competitions: { competitors: EspnTeam[] }[] }[] };
  return (j.events ?? []).map((e) => {
    const state = e.status.type.state;
    const side = (c: EspnTeam) => ({ abbreviation: c.team.abbreviation, name: c.team.displayName, logo: null, score: state === "pre" ? null : Number(c.score), winner: c.winner === true, record: null });
    const cs = e.competitions[0].competitors;
    return { id: e.id, start: e.date, state, detail: e.status.type.shortDetail, away: side(cs.find((c) => c.homeAway === "away")!), home: side(cs.find((c) => c.homeAway === "home")!) };
  });
}
async function news() {
  const j = (await (await fetch(`${ESPN}/news?limit=50`)).json()) as { articles?: { id?: number; type: string; headline: string; description?: string; published: string; categories?: { type: string; description?: string }[] }[] };
  return (j.articles ?? []).map((a, i) => ({
    id: String(a.id ?? i), type: a.type, headline: a.headline, description: a.description ?? "", published: a.published, url: null, image: null,
    athletes: (a.categories ?? []).filter((c) => c.type === "athlete" && c.description).map((c) => c.description!),
    teams: (a.categories ?? []).filter((c) => c.type === "team" && c.description).map((c) => c.description!),
  }));
}

const [{ league, teams, players }, trades, lastNight, tonight, articles] = await Promise.all([
  getValuedPlayers(), getScoredTrades(), games(ymd(-1)).catch(() => []), games(ymd(0)).catch(() => []), news().catch(() => []),
]);
const posts = xPostsOfTheDay({ today, siteUrl: "https://example.com", teams, players, trades, stats: teamStats(trades), rosters: rosterScores(players), lastNight, tonight, ideas: tradeIdeas(today, league, teams, players), news: articles });
const images = new Map(forChannel(posts, "x").map((p) => [p.id.replace(/^x:/, ""), p.image]));
for (const p of posts) console.log(`--- ${p.time} ${p.kind} (${p.length})\n${p.text}\nIMG ${images.get(p.id)}`);
console.log(posts.length, "posts; too long:", posts.filter((p) => p.length > 280).length);
