import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import LoadingBlock from "@/components/LoadingBlock";
import { MODE_INFO } from "@/components/ModeBadge";
import PlayerAvatar from "@/components/players/PlayerAvatar";
import ScoreBadge, { GradeChip, TierLabel } from "@/components/ScoreBadge";
import TradeRow from "@/components/trades/TradeRow";
import { Card, SectionTitle, TeamMark } from "@/components/ui";
import type { SeasonStats } from "@/lib/db/types";
import { formatMoney } from "@/lib/format";
import { getValuedPlayers } from "@/lib/players/values";
import type { TeamMode } from "@/lib/score";
import { previousSeason } from "@/lib/trades/assets";
import { getScoredTrades } from "@/lib/trades/scored";

export async function generateMetadata(props: PageProps<"/player/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const { players } = await getValuedPlayers();
  const p = players.find((x) => x.slug === slug);
  return p
    ? { title: `${p.name}: Trade Value ${p.score} — Trade Score`, description: `${p.name} (${p.team.name}) is worth ${p.score} (1-99 scale) in a trade.` }
    : { title: "Player not found — Trade Score" };
}

export default function PlayerPage(props: PageProps<"/player/[slug]">) {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Player params={props.params} />
    </Suspense>
  );
}

async function Player({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ league, teams, players }, trades] = await Promise.all([getValuedPlayers(), getScoredTrades()]);
  const p = players.find((x) => x.slug === slug);
  if (!p) notFound();

  const raw = teams.flatMap((t) => t.roster).find((x) => x.id === p.id)!;
  const rank = players.indexOf(p) + 1;
  const season = league.current_season;
  const lines: [string, SeasonStats | undefined][] = [
    [season, raw.stats_json[season]],
    [previousSeason(season), raw.stats_json[previousSeason(season)]],
  ];
  const involved = trades.filter((t) => t.teams.some((x) => x.receives.includes(p.name)));
  const contracts = raw.contracts.filter((c) => c.season >= season);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-center gap-4 sm:gap-6">
        <PlayerAvatar name={p.name} url={p.headshotUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <Link href={`/team/${p.team.slug}`} className="display flex items-center gap-2 text-sm font-bold text-muted hover:text-foreground">
            <TeamMark abbreviation={p.team.abbreviation} logoUrl={p.team.logo_url} /> {p.team.name}
          </Link>
          <h1 className="display mt-1 text-4xl font-extrabold leading-[0.9] sm:text-5xl">{p.name}</h1>
          <p className="num mt-2 text-sm text-muted">
            {p.position} · {p.age} yrs · #{rank} of {players.length} by Trade Value
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-[14px] border border-border bg-surface p-3">
          <ScoreBadge score={p.score} size="xl" />
          <div>
            <p className="display text-xs font-bold text-muted">Trade Value</p>
            <span className="flex items-center gap-2">
              <TierLabel score={p.score} className="text-lg" />
              <GradeChip score={p.score} />
            </span>
          </div>
        </div>
      </header>

      <section>
        <SectionTitle index={1} title="Value for each kind of team" />
        <div className="grid gap-3 sm:grid-cols-3">
          {(["contender", "middle", "rebuild"] as TeamMode[]).map((m) => (
            <Card key={m} className="flex items-center gap-3 p-4">
              <ScoreBadge score={p.byMode[m]} size="lg" />
              <div>
                <p className="display font-extrabold">{MODE_INFO[m].label}</p>
                <p className="text-xs text-muted">{MODE_INFO[m].hint}</p>
              </div>
            </Card>
          ))}
        </div>
        {!p.hasContract && (
          <p className="mt-3 rounded-[14px] border border-score-3/40 bg-score-3/10 px-4 py-3 text-sm">
            No contract data yet: his salary counts as $0, so this value reads too high.
          </p>
        )}
      </section>

      <section>
        <SectionTitle index={2} title="Stats" sub="per game" />
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[22rem] text-sm">
            <thead className="display border-b border-border text-left text-[11px] font-bold text-muted">
              <tr>
                {["Season", "GP", "PTS", "REB", "AST", "STL", "BLK", "TOV"].map((h) => (
                  <th key={h} className={`px-3 py-3 ${h === "Season" ? "" : "text-right"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map(([s, l]) => (
                <tr key={s} className="border-b border-border/60 last:border-0">
                  <td className="num px-3 py-2.5">{s}</td>
                  {l ? (
                    [l.gp, l.pts, l.orb + l.drb, l.ast, l.stl, l.blk, l.tov].map((v, i) => (
                      <td key={i} className="num px-3 py-2.5 text-right">{i === 0 ? v : v.toFixed(1)}</td>
                    ))
                  ) : (
                    <td colSpan={7} className="px-3 py-2.5 text-right text-muted">Did not play</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="num px-3 py-2 text-[11px] text-muted">
            Blended Game Score {p.gameScore.toFixed(1)} · availability {Math.round(p.availability * 100)}%
          </p>
        </Card>
      </section>

      <section>
        <SectionTitle index={3} title="Contract" sub={p.hasContract ? `${p.yearsLeft} yr${p.yearsLeft > 1 ? "s" : ""} · ${formatMoney(p.totalRemaining)}` : "unknown"} />
        {contracts.length > 0 ? (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {contracts.map((c) => (
              <li key={c.id} className="rounded-[14px] border border-border bg-surface p-3">
                <p className="num text-xs text-muted">{c.season}</p>
                <p className="display text-xl font-bold tabular-nums">{formatMoney(c.salary)}</p>
                <p className="num text-[11px] text-muted">{((c.salary / league.salary_cap) * 100).toFixed(1)}% of cap</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No contract on file yet.</p>
        )}
      </section>

      {involved.length > 0 && (
        <section>
          <SectionTitle index={4} title="Trades this season" />
          <Card className="divide-y divide-border">
            {involved.map((t) => (
              <TradeRow key={t.id} trade={t} />
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
