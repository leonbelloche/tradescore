import { todayEastern } from "@/lib/daily";
import { getNews } from "@/lib/nba/news";
import { getScoreboard, shiftDay } from "@/lib/nba/scoreboard";
import { getValuedPlayers, rosterScores } from "@/lib/players/values";
import { tradeIdeas } from "@/lib/trades/ideas";
import { getScoredTrades, teamStats } from "@/lib/trades/scored";
import { SITE_URL } from "@/lib/site";
import { xPostsOfTheDay } from "./xPosts";

export { todayEastern };

// Today's X posts, from everything the site knows. ESPN being down only removes the posts that need it.
export async function postsForToday() {
  const today = await todayEastern();
  const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);
  const [{ league, teams, players }, trades, lastNight, tonight, news] = await Promise.all([
    getValuedPlayers(),
    getScoredTrades(),
    safe(getScoreboard(shiftDay(today, -1)), { day: "", games: [] }),
    safe(getScoreboard(shiftDay(today, 0)), { day: "", games: [] }),
    safe(getNews(), []),
  ]);
  const posts = xPostsOfTheDay({
    today,
    siteUrl: SITE_URL,
    teams,
    players,
    trades,
    stats: teamStats(trades),
    rosters: rosterScores(players),
    lastNight: lastNight.games,
    tonight: tonight.games,
    ideas: tradeIdeas(today, league, teams, players),
    news,
  });
  return { today, posts };
}
