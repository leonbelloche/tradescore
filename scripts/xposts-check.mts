// Dev check: prints today's X posts from the real database (without ESPN games/news). Run: npx tsx --env-file=.env.local scripts/xposts-check.mts
import { xPostsOfTheDay } from "@/lib/admin/xPosts";
import { getValuedPlayers, rosterScores } from "@/lib/players/values";
import { tradeIdeas } from "@/lib/trades/ideas";
import { getScoredTrades, teamStats } from "@/lib/trades/scored";

const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const [{ league, teams, players }, trades] = await Promise.all([getValuedPlayers(), getScoredTrades()]);
const posts = xPostsOfTheDay({ today, siteUrl: "https://example.com", teams, players, trades, stats: teamStats(trades), rosters: rosterScores(players), lastNight: [], tonight: [], ideas: tradeIdeas(today, league, teams, players), news: [] });
for (const p of posts) console.log(`--- ${p.time} ${p.kind} (${p.length})\n${p.text}\n${p.url}`);
console.log(posts.length, "posts; too long:", posts.filter((p) => p.length > 280).length);
