import { Suspense } from "react";
import LoadingBlock from "@/components/LoadingBlock";
import TradeBuilder, { type BuilderTeam } from "@/components/trade/TradeBuilder";
import { getLeagueWithRosters } from "@/lib/db/teams";
import { toPlayerAsset } from "@/lib/trades/assets";

export default function TradeSimulatorPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="display text-sm font-bold text-accent">Your front office</p>
        <h1 className="display text-4xl font-extrabold leading-[1.02] sm:text-5xl">
          Build a <span className="text-accent">trade</span>
        </h1>
        <p className="max-w-xl text-muted">Pick 2 or 3 teams, tap the players and picks to move. Salaries are checked and the score updates live.</p>
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
    shortName: t.short_name ?? t.name,
    abbreviation: t.abbreviation,
    logoUrl: t.logo_url,
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
