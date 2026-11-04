import { Suspense } from "react";
import LoadingBlock from "@/components/LoadingBlock";
import TradeBuilder, { type BuilderTeam } from "@/components/trade/TradeBuilder";
import { getLeagueWithRosters } from "@/lib/db/teams";
import { blendGameScore, salariesAsCapFraction } from "@/lib/score/engine";

export default function TradeSimulatorPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight">Build a trade</h1>
        <p className="text-sm text-muted">Pick 2 or 3 teams, tap the players to move, and check the salaries live.</p>
      </header>
      <Suspense fallback={<LoadingBlock />}>
        <Simulator />
      </Suspense>
    </div>
  );
}

// "2026-27" -> "2025-26"
function previousSeason(season: string): string {
  const start = Number(season.slice(0, 4)) - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

async function Simulator() {
  const { league, teams } = await getLeagueWithRosters("nba");
  const current = league.current_season;
  const previous = previousSeason(current);

  // Only send the browser what the simulator needs.
  const builderTeams: BuilderTeam[] = teams.map((t) => ({
    id: t.id,
    name: t.name,
    abbreviation: t.abbreviation,
    wins: t.wins,
    losses: t.losses,
    payroll: t.payroll,
    players: t.roster.map((p) => {
      const { gameScore, availability } = blendGameScore(p.stats_json[current], p.stats_json[previous], t.wins + t.losses);
      const remaining = p.contracts.filter((c) => c.season >= current).map((c) => c.salary);
      return {
        id: p.id,
        name: p.name,
        position: p.position,
        age: p.age,
        salary: p.currentSalary,
        yearsLeft: p.yearsLeft,
        gameScore,
        availability,
        salaryCapFractions: salariesAsCapFraction(remaining, league.salary_cap),
      };
    }),
  }));

  return (
    <TradeBuilder
      leagueId={league.id}
      currentSeason={current}
      salaryCap={league.salary_cap}
      rules={league.rules_json}
      teams={builderTeams}
    />
  );
}
