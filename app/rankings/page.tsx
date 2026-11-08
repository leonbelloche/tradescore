import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import ModeBadge from "@/components/ModeBadge";
import RankingTabs from "@/components/rankings/RankingTabs";
import ScoreBadge, { TierLabel, scoreTone } from "@/components/ScoreBadge";
import TierBar from "@/components/trades/TierBar";
import { Card, SectionTitle, TeamMark } from "@/components/ui";
import { getLeagueWithRosters } from "@/lib/db/teams";
import { conferenceOf, standings, type Conference } from "@/lib/nba/conferences";
import { modeFromRecord } from "@/lib/score";
import { getScoredTrades, teamStats, type TeamSummary, type TeamTradeStats } from "@/lib/trades/scored";

export const metadata: Metadata = {
  title: "Rankings — Trade Score",
  description: "Every NBA team ranked by the average Trade Score of its 2026-27 trades, plus the classic NBA standings.",
};

export default function RankingsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="display text-sm font-bold text-accent">2026-27 season</p>
        <h1 className="display text-4xl font-extrabold leading-[1.02] sm:text-5xl">Rankings</h1>
        <p className="max-w-xl text-muted">Who trades best, and who wins on the court.</p>
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
  const traded = new Set(stats.map((s) => s.team.id));
  const idle = teams.filter((t) => !traded.has(t.id));
  const record = new Map(teams.map((t) => [t.id, t]));

  // ---------- Panel 1: Trade Score ----------
  const tradePanel = (
    <div className="space-y-10">
      <section>
        <SectionTitle index={1} title="Top 3 traders" />
        <TopThree
          items={stats.slice(0, 3).map((s) => ({
            team: s.team,
            value: <ScoreBadge score={s.average} size="lg" />,
            caption: <TierLabel score={s.average} className="text-xs" />,
            detail: `${s.trades} trade${s.trades > 1 ? "s" : ""} · ${s.wins}-${s.losses}`,
          }))}
        />
      </section>

      <section>
        <SectionTitle index={2} title="Trade Score table" sub={`${stats.length} teams`} />
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[22rem] text-sm">
            <thead className="display border-b border-border text-left text-[11px] font-bold text-muted">
              <tr>
                <th className="w-12 px-4 py-3">Rank</th>
                <th className="px-2 py-3">Team</th>
                <th className="hidden px-2 py-3 text-right sm:table-cell">Trades</th>
                <th className="hidden px-2 py-3 text-right sm:table-cell" title="Trades won - lost">
                  W-L
                </th>
                <th className="hidden px-2 py-3 text-right md:table-cell">Best</th>
                <th className="hidden px-2 py-3 text-right md:table-cell">Worst</th>
                <th className="w-40 px-4 py-3 text-right">Average</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => (
                <TradeRowLine key={s.team.id} rank={i + 1} stat={s} wins={record.get(s.team.id)?.wins ?? 0} losses={record.get(s.team.id)?.losses ?? 0} />
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section>
        <SectionTitle index={3} title="League mood" />
        <Card className="p-5">
          <TierBar scores={trades.flatMap((t) => t.teams.map((x) => x.score))} label="Share of results in each tier" />
        </Card>
      </section>

      {idle.length > 0 && (
        <section>
          <SectionTitle index={4} title="No trade yet" sub={`${idle.length} teams`} />
          <ul className="flex flex-wrap gap-2">
            {idle.map((t) => (
              <li key={t.id}>
                <Link href={`/team/${t.slug}`} className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface py-1 pl-2 pr-3 text-sm hover:border-accent/60">
                  <TeamMark abbreviation={t.abbreviation} logoUrl={t.logo_url} />
                  <span className="display font-bold">{t.short_name ?? t.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );

  // ---------- Panel 2: NBA standings ----------
  const overall = standings(teams);
  const byConf = (c: Conference) => standings(teams.filter((t) => conferenceOf(t.abbreviation) === c));
  const nbaPanel = (
    <div className="space-y-10">
      <section>
        <SectionTitle index={1} title="Top 3 records" sub="whole league" />
        <TopThree
          items={overall.slice(0, 3).map((t) => ({
            team: t,
            value: (
              <span className="display text-3xl font-extrabold tabular-nums">
                {t.wins}-{t.losses}
              </span>
            ),
            caption: <ModeBadge mode={modeFromRecord(t.wins, t.losses)} />,
            detail: `${t.pct.toFixed(3).replace(/^0/, "")} win% · ${conferenceOf(t.abbreviation)}`,
          }))}
        />
      </section>
      {(["East", "West"] as Conference[]).map((c, i) => (
        <section key={c}>
          <SectionTitle index={i + 2} title={`${c}ern Conference`} />
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[20rem] text-sm">
              <thead className="display border-b border-border text-left text-[11px] font-bold text-muted">
                <tr>
                  <th className="w-12 px-4 py-3">#</th>
                  <th className="px-2 py-3">Team</th>
                  <th className="px-2 py-3 text-right">W</th>
                  <th className="px-2 py-3 text-right">L</th>
                  <th className="px-2 py-3 text-right">Pct</th>
                  <th className="px-4 py-3 text-right">GB</th>
                </tr>
              </thead>
              <tbody>
                {byConf(c).map((t, rank) => (
                  <tr
                    key={t.id}
                    className={`border-b border-border/60 last:border-0 hover:bg-surface-2 ${rank === 5 ? "border-b-2 border-b-border-strong" : ""}`}
                  >
                    <td className={`num px-4 py-2.5 ${rank < 3 ? "text-accent" : "text-muted"}`}>{rank + 1}</td>
                    <td className="px-2 py-2.5">
                      <Link href={`/team/${t.slug}`} className="flex min-h-9 items-center gap-2.5">
                        <TeamMark abbreviation={t.abbreviation} logoUrl={t.logo_url} />
                        <span className="display truncate font-bold">{t.name}</span>
                        <ModeBadge mode={modeFromRecord(t.wins, t.losses)} className="hidden sm:inline-flex" />
                      </Link>
                    </td>
                    <td className="num px-2 py-2.5 text-right">{t.wins}</td>
                    <td className="num px-2 py-2.5 text-right">{t.losses}</td>
                    <td className="num px-2 py-2.5 text-right text-muted">{t.pct.toFixed(3).replace(/^0/, "")}</td>
                    <td className="num px-4 py-2.5 text-right text-muted">{t.gamesBehind === 0 ? "—" : t.gamesBehind.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-2 text-[11px] text-muted">Solid line: top 6 go straight to the playoffs · places 7-10: play-in.</p>
          </Card>
        </section>
      ))}
    </div>
  );

  return <RankingTabs tradeScore={tradePanel} standings={nbaPanel} />;
}

function TradeRowLine({ rank, stat, wins, losses }: { rank: number; stat: TeamTradeStats; wins: number; losses: number }) {
  return (
    <tr className="border-b border-border/60 last:border-0 hover:bg-surface-2">
      <td className={`num px-4 py-3 ${rank <= 3 ? "text-accent" : "text-muted"}`}>{String(rank).padStart(2, "0")}</td>
      <td className="px-2 py-3">
        <Link href={`/team/${stat.team.slug}`} className="flex min-h-9 items-center gap-2.5">
          <TeamMark abbreviation={stat.team.abbreviation} logoUrl={stat.team.logo_url} />
          <span className="min-w-0">
            <span className="display block truncate font-bold leading-tight">{stat.team.name}</span>
            <span className="flex items-center gap-1.5">
              <ModeBadge mode={modeFromRecord(wins, losses)} />
              <span className="num text-[11px] text-muted sm:hidden">
                {stat.trades} trade{stat.trades > 1 ? "s" : ""}
              </span>
            </span>
          </span>
        </Link>
      </td>
      <td className="num hidden px-2 py-3 text-right sm:table-cell">{stat.trades}</td>
      <td className="num hidden px-2 py-3 text-right sm:table-cell">
        {stat.wins}-{stat.losses}
      </td>
      <td className="hidden px-2 py-3 text-right md:table-cell">
        <Link href={`/trade/${stat.best.tradeId}`} aria-label={`Best trade, score ${stat.best.score}`}>
          <ScoreBadge score={stat.best.score} />
        </Link>
      </td>
      <td className="hidden px-2 py-3 text-right md:table-cell">
        <Link href={`/trade/${stat.worst.tradeId}`} aria-label={`Worst trade, score ${stat.worst.score}`}>
          <ScoreBadge score={stat.worst.score} />
        </Link>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-background sm:block" aria-hidden>
            <div className={`h-full ${scoreTone(stat.average).bg}`} style={{ width: `${stat.average}%` }} />
          </div>
          <ScoreBadge score={stat.average} size="md" />
        </div>
      </td>
    </tr>
  );
}

// Three compact cards: gold / silver / bronze.
const MEDALS = ["#ffb020", "#c9d1dc", "#d08a4a"];

function TopThree({
  items,
}: {
  items: { team: Pick<TeamSummary, "id" | "name" | "slug" | "abbreviation" | "logo_url">; value: React.ReactNode; caption: React.ReactNode; detail: string }[];
}) {
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {items.map((it, i) => (
        <li key={it.team.id}>
          <Link
            href={`/team/${it.team.slug}`}
            className="flex items-center gap-3 rounded-xl border bg-surface p-4 transition hover:bg-surface-2"
            style={{ borderColor: `${MEDALS[i]}66` }}
          >
            <span className="display w-7 text-2xl font-extrabold" style={{ color: MEDALS[i] }}>
              {i + 1}
            </span>
            <TeamMark abbreviation={it.team.abbreviation} logoUrl={it.team.logo_url} size="lg" />
            <span className="min-w-0 flex-1">
              <span className="display block truncate font-bold leading-tight">{it.team.name}</span>
              <span className="num block text-[11px] text-muted">{it.detail}</span>
              {it.caption}
            </span>
            {it.value}
          </Link>
        </li>
      ))}
    </ol>
  );
}
