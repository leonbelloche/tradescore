import { Suspense } from "react";
import Link from "next/link";
import TeamOfTheDay, { type TeamOfTheDayData } from "@/components/home/TeamOfTheDay";
import TradeOfTheDay, { pickTradeOfTheDay } from "@/components/home/TradeOfTheDay";
import { TAGLINE } from "@/components/layout/Logo";
import ScoreBadge, { TierLabel } from "@/components/ScoreBadge";
import ScoreScale from "@/components/ScoreScale";
import TierBar from "@/components/trades/TierBar";
import TradeRow, { formatDay } from "@/components/trades/TradeRow";
import { Button, Card, SectionTitle, TeamMark } from "@/components/ui";
import { ofTheDay, todayEastern } from "@/lib/daily";
import type { TeamWithRoster } from "@/lib/db/teams";
import type { League } from "@/lib/db/types";
import { conferenceOf, standings } from "@/lib/nba/conferences";
import { getValuedPlayers, rosterScores, type ValuedPlayer } from "@/lib/players/values";
import { suggestedTrade } from "@/lib/trades/ideas";
import { getScoredTrades, teamStats, type TeamTradeStats } from "@/lib/trades/scored";

const LATEST = 6; // trades shown before "See all"

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-[70vh] animate-pulse rounded-2xl bg-surface" />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const [trades, { league, teams, players }, today] = await Promise.all([getScoredTrades(), getValuedPlayers(), todayEastern()]);
  const stats = teamStats(trades);
  const chosen = (league.rules_json.site as { tradeOfTheWeek?: string | null } | undefined)?.tradeOfTheWeek;
  const tradeOfTheDay = pickTradeOfTheDay(trades, players, today, chosen);
  const team = teamOfTheDay(today, league, teams, players, stats);
  const heists = trades
    .flatMap((trade) => trade.teams.map((t) => ({ trade, t })))
    .sort((a, b) => b.t.score - a.t.score)
    .slice(0, 5);

  return (
    <div className="space-y-14">
      {/* 1. What the site is */}
      <section className="space-y-4 pt-2">
        <p className="num text-xs font-semibold text-accent">NBA · {league.current_season} · updated every day</p>
        <h1 className="display text-4xl font-extrabold leading-[1.02] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
          Who won
          <br />
          the <span className="pen-underline">trade?</span>
        </h1>
        <p className="display text-xl font-semibold sm:text-2xl">{TAGLINE}</p>
        <p className="max-w-md text-muted">Every NBA trade gets a score from 1 to 99 for each team. Win, lose, or get fleeced.</p>
        <div className="flex flex-wrap gap-3">
          <Button href="/trade">Build a trade ▸</Button>
          <Button href="/method" variant="ghost">
            How it works
          </Button>
        </div>
      </section>

      {/* 2. Today: changes every day */}
      <section aria-label="Today">
        <SectionTitle title="Today" sub={formatDay(today)} live />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {tradeOfTheDay ? (
            <TradeOfTheDay trade={tradeOfTheDay} today={today} players={players} />
          ) : (
            <Card className="p-6 text-center text-muted">No trades yet this season. Real trades show up here as soon as they are imported.</Card>
          )}
          {team && <TeamOfTheDay data={team} />}
        </div>
      </section>

      {trades.length > 0 && (
        <>
          {/* 3. The trades */}
          <section>
            <SectionTitle index={1} title="Latest trades" sub={`${trades.length} scored`} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {trades.slice(0, LATEST).map((trade) => (
                <TradeRow key={trade.id} trade={trade} />
              ))}
            </div>
            {trades.length > LATEST && (
              <details className="group mt-4">
                <summary className="display flex min-h-11 cursor-pointer list-none items-center justify-center rounded-xl border border-border bg-surface text-sm font-bold text-accent hover:border-accent/60 group-open:hidden">
                  See all {trades.length} trades ▾
                </summary>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {trades.slice(LATEST).map((trade) => (
                    <TradeRow key={trade.id} trade={trade} />
                  ))}
                </div>
              </details>
            )}
          </section>

          {/* 4. Who trades best, side by side with the biggest steals */}
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-6">
            <section className="min-w-0">
              <SectionTitle
                index={2}
                title="GM race"
                action={
                  <Link href="/rankings" className="display text-sm font-bold text-accent hover:underline">
                    Full rankings ▸
                  </Link>
                }
              />
              <div className="space-y-3">
                <GmCard label="Best GM" stat={stats[0]} />
                <GmCard label="Worst GM" stat={stats[stats.length - 1]} />
                <Card className="p-4">
                  <TierBar scores={trades.flatMap((t) => t.teams.map((x) => x.score))} label={`How teams fared · all ${league.current_season} trades`} />
                </Card>
              </div>
            </section>

            <section className="min-w-0">
              <SectionTitle index={3} title="Biggest heists" />
              <Card className="divide-y divide-border">
                {heists.map(({ trade, t }, i) => (
                  <Link key={`${trade.id}-${t.team.id}`} href={`/trade/${trade.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-surface-2">
                    <span className="num w-6 text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
                    <TeamMark abbreviation={t.team.abbreviation} logoUrl={t.team.logo_url} />
                    <span className="min-w-0 flex-1">
                      <span className="display block truncate text-base font-bold leading-tight">{t.team.name}</span>
                      <span className="block truncate text-xs text-muted">Got {t.receives.join(", ") || "nothing counted (cash)"}</span>
                    </span>
                    <TierLabel score={t.score} className="hidden text-sm sm:inline" />
                    <ScoreBadge score={t.score} size="md" />
                  </Link>
                ))}
              </Card>
            </section>
          </div>
        </>
      )}

      {/* 5. How to read the numbers */}
      <ScoreScale />
    </div>
  );
}

// The 30 teams take turns, one per day (alphabetical order, so the order is easy to predict for the admin).
function teamOfTheDay(today: string, league: League, teams: TeamWithRoster[], players: ValuedPlayer[], stats: TeamTradeStats[]): TeamOfTheDayData | null {
  const team = ofTheDay([...teams].sort((a, b) => a.name.localeCompare(b.name)), today);
  if (!team) return null;
  const roster = rosterScores(players);
  const conference = conferenceOf(team.abbreviation);
  const rank = standings(teams.filter((t) => conferenceOf(t.abbreviation) === conference)).findIndex((t) => t.id === team.id) + 1;
  const rosterRank = [...roster.values()].filter((s) => s > (roster.get(team.id) ?? 50)).length + 1;
  const tradeStats = stats.find((s) => s.team.id === team.id);
  return {
    team,
    rank,
    conference,
    roster: roster.get(team.id) ?? 50,
    rosterRank,
    core: players.filter((p) => p.team.id === team.id && p.hasContract).slice(0, 3),
    stats: tradeStats,
    move: tradeStats ? null : suggestedTrade(team, league, teams, players),
  };
}

function GmCard({ label, stat }: { label: string; stat: TeamTradeStats }) {
  return (
    <Link
      href={`/team/${stat.team.slug}`}
      className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition hover:border-accent/60"
    >
      <TeamMark abbreviation={stat.team.abbreviation} logoUrl={stat.team.logo_url} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="display text-xs font-bold text-accent">{label}</p>
        <p className="display text-xl font-bold leading-tight">{stat.team.name}</p>
        <p className="text-sm">
          <TierLabel score={stat.average} /> <span className="num text-xs text-muted">· {stat.trades} trade{stat.trades > 1 ? "s" : ""}</span>
        </p>
      </div>
      <ScoreBadge score={stat.average} size="lg" />
    </Link>
  );
}
