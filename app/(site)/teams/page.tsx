import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import ModeBadge from "@/components/ModeBadge";
import ScoreBadge from "@/components/ScoreBadge";
import { Card, TeamMark } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { conferenceOf, standings, type Conference } from "@/lib/nba/conferences";
import { getValuedPlayers, rosterScores, teamMode } from "@/lib/players/values";
import { suggestedTrade } from "@/lib/trades/ideas";
import { getScoredTrades, teamStats } from "@/lib/trades/scored";

export const metadata: Metadata = {
  title: "Teams — Trade Score",
  description: "All 30 NBA teams, East and West side by side: record, Trade Score, payroll and most valuable player.",
};

export default function TeamsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="display text-sm font-bold text-accent">2026-27 season</p>
        <h1 className="display text-4xl font-extrabold leading-[1.02] sm:text-5xl">Teams</h1>
        <p className="max-w-xl text-muted">East and West side by side: record, how well they trade, and who they could trade away.</p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <Teams />
      </Suspense>
    </div>
  );
}

async function Teams() {
  const [{ league, teams, players }, trades] = await Promise.all([getValuedPlayers(), getScoredTrades()]);
  const stats = new Map(teamStats(trades).map((s) => [s.team.id, s]));
  const topPlayer = new Map<string, (typeof players)[number]>();
  for (const p of players) if (!topPlayer.has(p.team.id)) topPlayer.set(p.team.id, p); // players are sorted best first
  const roster = rosterScores(players);
  // Teams that have not traded get the move our engine suggests.
  const suggestion = new Map(teams.filter((t) => !stats.has(t.id)).map((t) => [t.id, suggestedTrade(t, league, teams, players)]));

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {(["East", "West"] as Conference[]).map((c) => (
          <Card key={c} className="min-w-0 overflow-hidden">
            <h2 className="display flex items-center justify-between border-b border-border bg-surface-2 px-2 py-2 text-base font-extrabold sm:px-3 sm:text-lg">
              {c}
              <span className="flex gap-1 text-[10px] font-bold text-muted sm:gap-2.5">
                <span className="w-9 text-right sm:w-12">W-L</span>
                <span className="w-7 text-center sm:w-9" title="Trade Score: average grade of the team's trades">TS</span>
                <span className="w-7 text-center sm:w-9" title="Roster Score: how good the team's contracts are">RS</span>
              </span>
            </h2>
            <ol>
              {standings(teams.filter((t) => conferenceOf(t.abbreviation) === c)).map((t, rank) => {
                const s = stats.get(t.id);
                const star = topPlayer.get(t.id);
                const sug = suggestion.get(t.id);
                const line = rank === 5 ? "border-b-2 border-b-border-strong" : rank === 9 ? "border-b border-dashed border-b-border-strong" : "border-b border-border/60";
                return (
                  <li key={t.id} className={`last:border-0 ${line}`}>
                    <Link href={`/team/${t.slug}`} className="flex min-h-11 items-center gap-1 px-2 py-1.5 hover:bg-surface-2 sm:gap-2.5 sm:px-3">
                      <span className={`num w-4 shrink-0 text-[11px] ${rank < 6 ? "text-accent" : "text-muted"}`}>{rank + 1}</span>
                      <TeamMark abbreviation={t.abbreviation} logoUrl={t.logo_url} />
                      <span className="min-w-0 flex-1">
                        <span className="display hidden truncate text-sm font-bold leading-tight sm:block sm:text-base">{t.short_name ?? t.name}</span>
                        <span className="hidden min-w-0 items-center gap-1.5 text-[11px] text-muted lg:flex">
                          <ModeBadge mode={teamMode(t)} />
                          <span className="num">{formatMoney(t.payroll)}</span>
                          {sug ? (
                            <span className="truncate text-accent">· {sug.role === "buy" ? "should get" : "should sell"} {sug.idea.target.name.split(" ").slice(-1)[0]}</span>
                          ) : (
                            star && <span className="truncate">· {star.name.split(" ").slice(-1)[0]} {star.score}</span>
                          )}
                        </span>
                      </span>
                      <span className="num w-9 shrink-0 text-right text-xs sm:w-12 sm:text-sm">
                        {t.wins}-{t.losses}
                      </span>
                      <span className="flex w-7 shrink-0 justify-center sm:w-9">
                        {s ? <ScoreBadge score={s.average} /> : <span className="text-xs text-muted" title="No trade yet">–</span>}
                      </span>
                      <span className="flex w-7 shrink-0 justify-center sm:w-9">
                        <ScoreBadge score={roster.get(t.id) ?? 50} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted">
        Amber = top 6, straight to the playoffs · solid line after 6th, dashed line after 10th (play-in) · TS = Trade Score, the average grade of the team&apos;s trades (– = no trade yet) · RS = Roster Score, how good its contracts are (average Trade Value of its 8 most valuable players). Teams with no trade get a suggested move on their page.
        Payroll is {league.salary_cap ? `compared with a ${formatMoney(league.salary_cap)} cap` : "shown"} on wide screens.
      </p>
    </>
  );
}
