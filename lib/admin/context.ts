// The facts Claude is allowed to use: a compact text summary of the site's data,
// focused on the players and teams a given text mentions.
import { formatMoney } from "@/lib/format";
import { getValuedPlayers, rosterScores } from "@/lib/players/values";
import { getScoredTrades, teamStats } from "@/lib/trades/scored";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export async function siteContext(focus = ""): Promise<string> {
  const [{ league, teams, players }, trades] = await Promise.all([getValuedPlayers(), getScoredTrades()]);
  const rs = rosterScores(players);
  const ts = new Map(teamStats(trades).map((s) => [s.team.id, s]));
  const text = norm(focus);

  // Players and teams named in the focus text (full name, or a distinctive last name).
  const lastNameCount = new Map<string, number>();
  for (const p of players) {
    const last = norm(p.name.split(" ").slice(-1)[0]);
    lastNameCount.set(last, (lastNameCount.get(last) ?? 0) + 1);
  }
  const mentioned = players.filter((p) => {
    const last = norm(p.name.split(" ").slice(-1)[0]);
    return text.includes(norm(p.name)) || (last.length >= 5 && lastNameCount.get(last) === 1 && new RegExp(`\\b${esc(last)}\\b`).test(text));
  });
  const mentionedTeams = teams.filter(
    (t) => text.includes(norm(t.name)) || (t.short_name && new RegExp(`\\b${esc(norm(t.short_name))}\\b`).test(text)) || mentioned.some((p) => p.team.id === t.id),
  );

  const lines: string[] = [];
  lines.push(`Season ${league.current_season}. Salary cap ${formatMoney(league.salary_cap)}.`);
  lines.push("", "TRADES GRADED THIS SEASON (newest first; [trade id] date: score per team, 1-99):");
  for (const t of trades.slice(0, 20)) {
    lines.push(`- [${t.id}] ${t.date}: ` + t.teams.map((x) => `${x.team.short_name ?? x.team.name} ${x.score} (${x.tier}) gets ${x.receives.join(", ") || "nothing counted"}`).join(" | "));
  }
  if (mentionedTeams.length) {
    lines.push("", "TEAMS MENTIONED:");
    for (const t of mentionedTeams.slice(0, 6)) {
      const s = ts.get(t.id);
      lines.push(`- ${t.name}: record ${t.wins}-${t.losses}, Roster Score ${rs.get(t.id) ?? 50}/99${s ? `, Trade Score ${s.average}/99 over ${s.trades} trade(s)` : ", no trade yet"}`);
    }
  }
  if (mentioned.length) {
    lines.push("", "PLAYERS MENTIONED (Trade Value 1-99: 50 = paid exactly what he is worth):");
    for (const p of mentioned.slice(0, 8)) {
      lines.push(`- ${p.name} (${p.team.short_name ?? p.team.name}, ${p.position}, ${p.age}): Trade Value ${p.score}/99, ${p.hasContract ? `${formatMoney(p.salary)} this season, ${p.yearsLeft} year(s) left` : "contract unknown"}`);
    }
  }
  const best = players.filter((p) => p.hasContract).slice(0, 5);
  lines.push("", "BEST VALUE CONTRACTS: " + best.map((p) => `${p.name} ${p.score}`).join(", "));
  return lines.join("\n");
}
