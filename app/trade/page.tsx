import { Suspense } from "react";
import LoadingBlock from "@/components/LoadingBlock";
import TradeBuilder, { type BuilderTeam } from "@/components/trade/TradeBuilder";
import { getLeagueWithRosters } from "@/lib/db/teams";
import { toPlayerAsset } from "@/lib/trades/assets";

export default function TradeSimulatorPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="display text-4xl font-bold leading-none">Build a trade</h1>
        <p className="text-sm text-muted">Pick 2 or 3 teams, tap the players to move, and check the salaries live.</p>
      </header>
      <Suspense fallback={<LoadingBlock />}>
        <Simulator />
      </Suspense>
    </div>
  );
}

async function Simulator() {
  const { league, teams } = await getLeagueWithRosters("nba");

  // Only send the browser what the simulator needs.
  const builderTeams: BuilderTeam[] = teams.map((t) => ({
    id: t.id,
    name: t.name,
    abbreviation: t.abbreviation,
    wins: t.wins,
    losses: t.losses,
    payroll: t.payroll,
    players: t.roster.map((p) => {
      const asset = toPlayerAsset(p, t, league);
      return {
        id: p.id,
        name: p.name,
        position: p.position,
        age: p.age,
        salary: p.currentSalary,
        yearsLeft: p.yearsLeft,
        gameScore: asset.gameScore,
        availability: asset.availability,
        salaryCapFractions: asset.salaries,
      };
    }),
  }));

  return (
    <TradeBuilder
      currentSeason={league.current_season}
      salaryCap={league.salary_cap}
      rules={league.rules_json}
      teams={builderTeams}
    />
  );
}
