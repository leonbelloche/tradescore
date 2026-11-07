// Scores the season's real trades (stored in the `trades` table) with the Trade Score engine.
import { supabase } from "@/lib/db/client";
import { getLeagueWithRosters, type RosterPlayer, type TeamWithRoster } from "@/lib/db/teams";
import type { TradeRow } from "@/lib/db/types";
import { modeFromRecord, scoreTrade, type Asset, type TeamMode, type TeamResult, type TradeLeg, type Verdict } from "@/lib/score";
import { draftYearOf, toPlayerAsset } from "./assets";

export type TeamSummary = Pick<TeamWithRoster, "id" | "name" | "short_name" | "slug" | "abbreviation" | "logo_url" | "wins" | "losses">;

export type ScoredTeam = {
  team: TeamSummary;
  mode: TeamMode;
  score: number;
  tier: string;
  verdict: Verdict;
  receives: string[]; // asset names
  result: TeamResult; // full detail (asset values and calculation steps) for the Method page
};

export type ScoredTrade = {
  id: string; // slug
  date: string;
  teams: ScoredTeam[]; // best score first
  winner: ScoredTeam | null; // null = even trade
  source: string | null; // ESPN wording
  // Data problems that make the score less reliable, in plain English.
  warnings: string[];
};

const summary = (t: TeamWithRoster): TeamSummary => ({
  id: t.id, name: t.name, short_name: t.short_name, slug: t.slug, abbreviation: t.abbreviation, logo_url: t.logo_url, wins: t.wins, losses: t.losses,
});

export async function getScoredTrades(): Promise<ScoredTrade[]> {
  const [{ league, teams }, tradesRes] = await Promise.all([
    getLeagueWithRosters("nba"),
    supabase.from("trades").select("*").order("trade_date", { ascending: false }),
  ]);
  if (tradesRes.error) throw new Error(`Could not load trades: ${tradesRes.error.message}`);

  const teamByAbbr = new Map(teams.map((t) => [t.abbreviation, t]));
  // A player is scored with his CURRENT data, wherever he plays now.
  const playerByEspnId = new Map<string, { player: RosterPlayer; team: TeamWithRoster }>();
  for (const team of teams) for (const player of team.roster) if (player.espn_id) playerByEspnId.set(player.espn_id, { player, team });
  const thisDraft = draftYearOf(league.current_season);

  return (tradesRes.data as TradeRow[]).map((row) => {
    const warnings: string[] = [];
    const legs: TradeLeg[] = [];

    row.assets_json.forEach((a, i) => {
      const from = teamByAbbr.get(a.from)!;
      const to = teamByAbbr.get(a.to)!;
      let asset: Asset;
      if ("name" in a) {
        const found = a.espn_id ? playerByEspnId.get(a.espn_id) : undefined;
        if (!found) {
          warnings.push(`${a.name} is no longer on an NBA roster and is not counted.`);
          return;
        }
        if (found.player.currentSalary === 0) warnings.push(`${a.name}'s contract is missing: his salary is not counted.`);
        asset = toPlayerAsset(found.player, found.team, league);
      } else {
        // ESPN rarely details picks: "draft considerations" are valued as a future 2nd-round pick.
        const round = a.pick === "first" ? 1 : 2;
        asset = {
          kind: "pick",
          id: `${row.slug}-pick-${i}`,
          name: a.pick === "considerations" ? `Draft considerations · ${from.abbreviation}` : `${a.year ?? "Future"} ${round === 1 ? "1st" : "2nd"} · ${from.abbreviation}`,
          round,
          yearsUntilDraft: a.year ? a.year - thisDraft : 1,
        };
      }
      legs.push({ asset, fromTeamId: from.id, toTeamId: to.id });
    });

    const involved = row.teams_json.map((abbr) => teamByAbbr.get(abbr)!);
    const result = scoreTrade({
      league: "NBA",
      salaryCap: league.salary_cap,
      rules: league.rules_json,
      teams: involved.map((t) => ({ id: t.id, abbreviation: t.abbreviation, mode: modeFromRecord(t.wins, t.losses), payroll: t.payroll })),
      legs,
      // Real trades use CBA exceptions (trade exceptions, etc.) our simplified rules don't model.
      skipValidation: true,
    });
    if (!result.valid) throw new Error(`Trade ${row.slug} could not be scored: ${result.errors.join(" ")}`);

    const scoredTeams: ScoredTeam[] = result.teams
      .map((r) => ({
        team: summary(involved.find((t) => t.id === r.teamId)!),
        mode: r.mode,
        score: r.score,
        tier: r.tier,
        verdict: r.verdict,
        receives: r.received.map((x) => x.label),
        result: r,
      }))
      .sort((a, b) => b.score - a.score);

    return {
      id: row.slug,
      date: row.trade_date,
      teams: scoredTeams,
      winner: result.isEven ? null : scoredTeams[0],
      source: row.source_text,
      warnings,
    };
  });
}

export type TeamTradeStats = {
  team: TeamSummary;
  trades: number;
  average: number; // average Trade Score over the team's trades
};

export function teamStats(trades: ScoredTrade[]): TeamTradeStats[] {
  const byTeam = new Map<string, { team: TeamSummary; scores: number[] }>();
  for (const trade of trades) {
    for (const t of trade.teams) {
      const entry = byTeam.get(t.team.id) ?? { team: t.team, scores: [] };
      entry.scores.push(t.score);
      byTeam.set(t.team.id, entry);
    }
  }
  return [...byTeam.values()]
    .map(({ team, scores }) => ({
      team,
      trades: scores.length,
      average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))
    .sort((a, b) => b.average - a.average || b.trades - a.trades);
}
