import { Suspense } from "react";
import LoadingBlock from "@/components/LoadingBlock";
import TradeBuilder, { type BuilderTeam } from "@/components/trade/TradeBuilder";
import { getLeagueWithRosters } from "@/lib/db/teams";

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

async function Simulator() {
  const { league, teams } = await getLeagueWithRosters("nba");

  // Only send the browser what the simulator needs.
  const builderTeams: BuilderTeam[] = teams.map((t) => ({
    id: t.id,
    name: t.name,
    abbreviation: t.abbreviation,
    payroll: t.payroll,
    players: t.roster.map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      age: p.age,
      salary: p.currentSalary,
      yearsLeft: p.yearsLeft,
    })),
  }));

  return (
    <TradeBuilder
      leagueId={league.id}
      salaryCap={league.salary_cap}
      rules={league.rules_json}
      teams={builderTeams}
    />
  );
}
