import type { Metadata } from "next";
import { Suspense } from "react";
import CompareView, { type ComparePlayer, type CompareTeam } from "@/components/compare/CompareView";
import { getValuedPlayers } from "@/lib/players/values";
import { getScoredTrades, teamStats } from "@/lib/trades/scored";

export const metadata: Metadata = {
  title: "Head to head — Trade Score",
  description: "Compare two NBA teams' trade records, or two players' Trade Values, side by side.",
};

export default function ComparePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="display text-sm font-bold text-accent">Head to head</p>
        <h1 className="display text-4xl font-extrabold leading-[1.02] sm:text-5xl">Compare</h1>
        <p className="max-w-xl text-muted">Two teams or two players, side by side. The amber dot marks who wins each line.</p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <Compare />
      </Suspense>
    </div>
  );
}

async function Compare() {
  const [{ teams, players }, trades] = await Promise.all([getValuedPlayers(), getScoredTrades()]);
  const stats = new Map(teamStats(trades).map((s) => [s.team.id, s]));

  const compareTeams: CompareTeam[] = teams.map((t) => {
    const s = stats.get(t.id);
    const mine = players.filter((p) => p.team.id === t.id);
    return {
      id: t.id, name: t.name, slug: t.slug, abbreviation: t.abbreviation, logo_url: t.logo_url,
      wins: t.wins, losses: t.losses, payroll: t.payroll,
      trades: s?.trades ?? 0, tradeAverage: s?.average ?? null, tradeWins: s?.wins ?? 0, tradeLosses: s?.losses ?? 0,
      rosterValue: mine.reduce((sum, p) => sum + Math.max(0, p.score - 50), 0),
      star: mine[0] ? { name: mine[0].name, score: mine[0].score } : null,
    };
  });
  // Start on the two most traded teams: the most interesting matchup.
  compareTeams.sort((a, b) => b.trades - a.trades || a.name.localeCompare(b.name));

  const comparePlayers: ComparePlayer[] = players.map((p) => ({
    id: p.id, name: p.name, slug: p.slug, headshotUrl: p.headshotUrl,
    teamAbbr: p.team.abbreviation, teamName: p.team.name, teamLogo: p.team.logo_url,
    age: p.age, position: p.position, score: p.score, contender: p.byMode.contender, rebuild: p.byMode.rebuild,
    gameScore: p.gameScore, salary: p.salary, yearsLeft: p.yearsLeft,
  }));

  return <CompareView teams={compareTeams} players={comparePlayers} />;
}
