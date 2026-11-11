// Dev check: prints today's X post image URLs (signed). Run: npx tsx --env-file=.env.local scripts/xposts-images.mts
import { xPostsOfTheDay } from "@/lib/admin/xPosts";
import { forChannel } from "@/lib/social/channels";
import { getValuedPlayers, rosterScores } from "@/lib/players/values";
import { tradeIdeas } from "@/lib/trades/ideas";
import { getScoredTrades, teamStats } from "@/lib/trades/scored";

const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const [{ league, teams, players }, trades] = await Promise.all([getValuedPlayers(), getScoredTrades()]);
const posts = xPostsOfTheDay({ today, siteUrl: "https://example.com", teams, players, trades, stats: teamStats(trades), rosters: rosterScores(players), lastNight: [], tonight: [], ideas: tradeIdeas(today, league, teams, players), news: [] });
for (const p of forChannel(posts, "x")) console.log(`${p.kind}\t${p.image}`);
