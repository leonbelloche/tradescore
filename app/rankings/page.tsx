import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import ScoreBadge, { TierLabel } from "@/components/ScoreBadge";
import TierBar from "@/components/trades/TierBar";
import { Card, SectionTitle, TeamMark } from "@/components/ui";
import { getLeagueWithRosters } from "@/lib/db/teams";
import { getScoredTrades, teamStats, type TeamTradeStats } from "@/lib/trades/scored";

export const metadata: Metadata = {
  title: "GM Rankings — Trade Score",
  description: "Every NBA team ranked by the average Trade Score of its 2026-27 trades.",
};

export default function RankingsPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="display text-sm font-bold text-accent">2026-27 season</p>
        <h1 className="display text-6xl font-black leading-[0.85] sm:text-7xl">GM rankings</h1>
        <p className="max-w-xl text-muted">Teams ranked by the average Trade Score of every trade they made this season. 50 = broke even.</p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <Rankings />
      </Suspense>
    </div>
  );
}

async function Rankings() {
  const [trades, { teams }] = await Promise.all([getScoredTrades(), getLeagueWithRosters("nba")]);
  const stats = teamStats(trades);
  const ranked = new Set(stats.map((s) => s.team.id));
  const idle = teams.filter((t) => !ranked.has(t.id));
  const podium = stats.slice(0, 3);

  return (
    <>
      {/* Podium: 2nd · 1st · 3rd on wide screens, 1st first on phones */}
      <section aria-label="Top 3">
        <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
          {podium.map((s, i) => (
            <Podium key={s.team.id} rank={i + 1} stat={s} className={i === 0 ? "sm:order-2" : i === 1 ? "sm:order-1" : "sm:order-3"} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle index={1} title="Full table" sub={`${stats.length} teams traded`} />
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="display bg-surface-2 text-left text-xs font-bold text-muted">
              <tr>
                <th className="w-10 px-3 py-2">#</th>
                <th className="px-2 py-2">Team</th>
                <th className="hidden px-2 py-2 text-right sm:table-cell">Trades</th>
                <th className="hidden px-2 py-2 text-right sm:table-cell">W-L</th>
                <th className="hidden px-2 py-2 text-right md:table-cell">Best</th>
                <th className="px-3 py-2 text-right">Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.map((s, i) => (
                <tr key={s.team.id} className="hover:bg-surface-2">
                  <td className="num px-3 py-2 text-accent">{String(i + 1).padStart(2, "0")}</td>
                  <td className="px-2 py-2">
                    <Link href={`/team/${s.team.slug}`} className="flex min-h-11 items-center gap-2.5">
                      <TeamMark abbreviation={s.team.abbreviation} logoUrl={s.team.logo_url} />
                      <span className="min-w-0">
                        <span className="display block truncate text-lg font-extrabold leading-tight">{s.team.name}</span>
                        <TierLabel score={s.average} className="text-xs" />
                        <span className="num text-xs text-muted sm:hidden"> · {s.trades} trade{s.trades > 1 ? "s" : ""}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="num hidden px-2 py-2 text-right sm:table-cell">{s.trades}</td>
                  <td className="num hidden px-2 py-2 text-right sm:table-cell">
                    {s.wins}-{s.losses}
                  </td>
                  <td className="hidden px-2 py-2 text-right md:table-cell">
                    <Link href={`/trade/${s.best.tradeId}`} aria-label={`Best trade, score ${s.best.score}`}>
                      <ScoreBadge score={s.best.score} />
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <ScoreBadge score={s.average} size="md" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section>
        <SectionTitle index={2} title="League mood" />
        <Card className="p-4">
          <TierBar scores={trades.flatMap((t) => t.teams.map((x) => x.score))} label="Share of results in each tier" />
        </Card>
      </section>

      {idle.length > 0 && (
        <section>
          <SectionTitle index={3} title="Haven't traded yet" sub={`${idle.length} teams`} />
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {idle.map((t) => (
              <li key={t.id}>
                <Link href={`/team/${t.slug}`} className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:border-accent/60">
                  <TeamMark abbreviation={t.abbreviation} logoUrl={t.logo_url} />
                  <span className="display truncate font-bold">{t.short_name ?? t.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function Podium({ rank, stat, className }: { rank: number; stat: TeamTradeStats; className: string }) {
  const tall = rank === 1;
  return (
    <Link
      href={`/team/${stat.team.slug}`}
      className={`led flex flex-col items-center rounded-2xl border bg-black px-4 text-center transition hover:border-accent ${
        tall ? "border-accent py-8" : "border-border-strong py-6"
      } ${className}`}
    >
      <span className={`display font-black ${tall ? "text-5xl text-accent" : "text-3xl text-muted"}`}>#{rank}</span>
      <TeamMark abbreviation={stat.team.abbreviation} logoUrl={stat.team.logo_url} size="lg" />
      <span className="display mt-2 text-2xl font-extrabold leading-tight">{stat.team.name}</span>
      <span className="num mt-1 text-xs text-muted">
        {stat.trades} trade{stat.trades > 1 ? "s" : ""} · {stat.wins}-{stat.losses}
      </span>
      <div className="mt-3">
        <ScoreBadge score={stat.average} size={tall ? "xl" : "lg"} />
      </div>
      <TierLabel score={stat.average} className="mt-1 text-sm" />
    </Link>
  );
}
