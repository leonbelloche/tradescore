// Scores the season's trades with the Trade Score engine.
import { getLeagueWithRosters, type TeamWithRoster } from "@/lib/db/teams";
import { getLeagueRules } from "@/lib/leagues";
import { modeFromRecord, scoreTrade, type Asset, type TradeInput } from "@/lib/score/engine";
import type { TeamMode } from "@/lib/score/config";
import { draftYearOf, projectedSlots, toPlayerAsset } from "./assets";
import { DEMO_TRADES, type DemoTrade } from "./demo";

export type ScoredTeam = {
  team: Pick<TeamWithRoster, "id" | "name" | "slug" | "abbreviation" | "wins" | "losses">;
  mode: TeamMode;
  score: number;
  tier: string;
  receives: string[]; // asset names
};

export type ScoredTrade = {
  id: string;
  date: string;
  teams: ScoredTeam[]; // best score first
  winner: ScoredTeam | null; // null = even trade
};

function buildTrade(def: DemoTrade, teamsBySlug: Map<string, TeamWithRoster>, league: Awaited<ReturnType<typeof getLeagueWithRosters>>["league"], slots: Map<string, number>) {
  const team = (slug: string) => {
    const t = teamsBySlug.get(slug);
    if (!t) throw new Error(`Trade ${def.id}: unknown team ${slug}`);
    return t;
  };
  const thisDraft = draftYearOf(league.current_season);

  const moves: TradeInput["moves"] = def.moves.map((m, i) => {
    const from = team(m.from);
    const to = team(m.to);
    let asset: Asset;
    if ("player" in m) {
      const p = from.roster.find((r) => r.slug === m.player);
      if (!p) throw new Error(`Trade ${def.id}: ${m.player} is not on ${m.from}`);
      asset = toPlayerAsset(p, from, league);
    } else {
      asset = {
        kind: "pick",
        id: `${def.id}-pick-${i}`,
        name: `${m.pick.year} ${m.pick.round === 1 ? "1st" : "2nd"}${m.pick.protected ? " (prot.)" : ""} · ${from.abbreviation}`,
        round: m.pick.round,
        yearsUntilDraft: m.pick.year - thisDraft,
        projectedSlot: slots.get(from.id),
        protected: m.pick.protected,
      };
    }
    return { asset, from: from.id, to: to.id };
  });

  const teamIds = [...new Set(moves.flatMap((m) => [m.from, m.to]))];
  const teams = teamIds.map((id) => [...teamsBySlug.values()].find((t) => t.id === id)!);
  return { moves, teams };
}

export async function getScoredTrades(): Promise<ScoredTrade[]> {
  const { league, teams } = await getLeagueWithRosters("nba");
  const teamsBySlug = new Map(teams.map((t) => [t.slug, t]));
  const slots = projectedSlots(teams);
  const rules = getLeagueRules(league.id);

  return DEMO_TRADES.map((def) => {
    const { moves, teams: involved } = buildTrade(def, teamsBySlug, league, slots);

    // Safety net: demo trades must respect the salary rules.
    const check = rules.validateTrade({
      salaryCap: league.salary_cap,
      rules: league.rules_json,
      teams: involved.map((t) => ({ id: t.id, abbreviation: t.abbreviation, payroll: t.payroll })),
      moves: moves.map((m) => ({
        playerId: m.asset.id,
        from: m.from,
        to: m.to,
        salary: m.asset.kind === "player" ? m.asset.salaries[0] * league.salary_cap : 0,
      })),
    });
    if (!check.valid) throw new Error(`Demo trade ${def.id} breaks the salary rules: ${check.errors.join(" ")}`);

    const result = scoreTrade({
      teams: involved.map((t) => ({ id: t.id, mode: modeFromRecord(t.wins, t.losses) })),
      moves,
    });

    const scoredTeams: ScoredTeam[] = result.teams
      .map((r) => {
        const t = involved.find((x) => x.id === r.teamId)!;
        return {
          team: { id: t.id, name: t.name, slug: t.slug, abbreviation: t.abbreviation, wins: t.wins, losses: t.losses },
          mode: r.mode,
          score: r.score,
          tier: r.tier,
          receives: r.received.map((a) => a.name),
        };
      })
      .sort((a, b) => b.score - a.score);

    return {
      id: def.id,
      date: def.date,
      teams: scoredTeams,
      winner: result.isEven ? null : scoredTeams[0],
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

export type TeamTradeStats = {
  team: ScoredTeam["team"];
  trades: number;
  average: number; // average Trade Score over the team's trades
};

export function teamStats(trades: ScoredTrade[]): TeamTradeStats[] {
  const byTeam = new Map<string, { team: ScoredTeam["team"]; scores: number[] }>();
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
    .sort((a, b) => b.average - a.average);
}
