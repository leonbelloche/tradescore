import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import LoadingBlock from "@/components/LoadingBlock";
import ModeBadge from "@/components/ModeBadge";
import PlayerAvatar from "@/components/players/PlayerAvatar";
import ScoreBadge, { TierLabel } from "@/components/ScoreBadge";
import TradeRow from "@/components/trades/TradeRow";
import { Card, Record, SectionTitle, TeamMark } from "@/components/ui";
import { getTeamBySlug } from "@/lib/db/teams";
import { formatMoney } from "@/lib/format";
import { conferenceOf, standings } from "@/lib/nba/conferences";
import { getValuedPlayers, teamMode } from "@/lib/players/values";
import { getScoredTrades, teamStats } from "@/lib/trades/scored";

export async function generateMetadata(props: PageProps<"/team/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const team = await getTeamBySlug(slug);
  return team
    ? { title: `${team.name} (${team.wins}-${team.losses}) — Trade Score`, description: `${team.name}: record, payroll, trade grades and the Trade Value of every player.` }
    : { title: "Team not found — Trade Score" };
}

export default function TeamPage(props: PageProps<"/team/[slug]">) {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Team params={props.params} />
    </Suspense>
  );
}

async function Team({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [team, { teams, players }, trades] = await Promise.all([getTeamBySlug(slug), getValuedPlayers(), getScoredTrades()]);
  if (!team) notFound();

  const conf = conferenceOf(team.abbreviation);
  const confRank = standings(teams.filter((t) => conferenceOf(t.abbreviation) === conf)).findIndex((t) => t.id === team.id) + 1;
  const roster = players.filter((p) => p.team.id === team.id);
  const myTrades = trades.filter((t) => t.teams.some((x) => x.team.id === team.id));
  const stat = teamStats(trades).find((s) => s.team.id === team.id);
  const overCap = team.capSpace < 0;
  const missingSalary = roster.filter((p) => !p.hasContract);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-center gap-4 sm:gap-6">
        <TeamMark abbreviation={team.abbreviation} logoUrl={team.logo_url} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="display text-sm font-bold text-accent">
            {confRank}
            {confRank === 1 ? "st" : confRank === 2 ? "nd" : confRank === 3 ? "rd" : "th"} in the {conf} · {team.league.current_season}
          </p>
          <h1 className="display text-4xl font-extrabold leading-[0.9] sm:text-5xl">{team.name}</h1>
          <ModeBadge mode={teamMode(team)} className="mt-2" />
        </div>
        <Record wins={team.wins} losses={team.losses} size="lg" />
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <Stat label="Trade Score" value={stat ? <ScoreBadge score={stat.average} size="lg" /> : "—"} sub={stat ? <TierLabel score={stat.average} className="text-xs" /> : "No trade yet"} />
        <Stat label="Trades won-lost" value={stat ? `${stat.wins}-${stat.losses}` : "0-0"} sub={`${myTrades.length} trade${myTrades.length === 1 ? "" : "s"}`} />
        <Stat label="Payroll" value={formatMoney(team.payroll)} sub={`cap ${formatMoney(team.league.salary_cap)}`} />
        <Stat
          label={overCap ? "Over the cap" : "Cap space"}
          value={<span className={overCap ? "text-score-1" : "text-score-5"}>{formatMoney(Math.abs(team.capSpace))}</span>}
        />
      </section>

      {myTrades.length > 0 && (
        <section>
          <SectionTitle index={1} title="Trades this season" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {myTrades.map((t) => (
              <TradeRow key={t.id} trade={t} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle index={2} title="Roster" sub="by Trade Value" />
        {missingSalary.length > 0 && (
          <p className="mb-3 rounded-[14px] border border-score-3/40 bg-score-3/10 px-4 py-3 text-sm">
            No contract data yet for {missingSalary.map((p) => p.name).join(", ")}: they count as $0 in the payroll and their value reads too high.
          </p>
        )}
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[20rem] text-sm">
            <thead className="display border-b border-border text-left text-[11px] font-bold text-muted">
              <tr>
                <th className="px-3 py-3">Player</th>
                <th className="hidden px-2 py-3 text-right sm:table-cell">Age</th>
                <th className="px-2 py-3 text-right">Salary</th>
                <th className="hidden px-2 py-3 text-right md:table-cell">Contract</th>
                <th className="px-3 py-3 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((p) => (
                <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-surface-2">
                  <td className="px-3 py-2">
                    <Link href={`/player/${p.slug}`} className="flex min-h-10 items-center gap-2.5 hover:text-accent">
                      <PlayerAvatar name={p.name} url={p.headshotUrl} />
                      <span className="min-w-0">
                        <span className="display block truncate font-bold leading-tight">{p.name}</span>
                        <span className="num text-[11px] text-muted">{p.position}<span className="sm:hidden"> · {p.age} yrs</span></span>
                      </span>
                    </Link>
                  </td>
                  <td className="num hidden px-2 py-2 text-right sm:table-cell">{p.age}</td>
                  <td className="num px-2 py-2 text-right">{p.hasContract ? formatMoney(p.salary) : <span className="text-muted">—</span>}</td>
                  <td className="num hidden px-2 py-2 text-right text-muted md:table-cell">
                    {p.yearsLeft} yr{p.yearsLeft > 1 ? "s" : ""} / {formatMoney(p.totalRemaining)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <ScoreBadge score={p.score} size="md" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="mt-2 text-xs text-muted">Stats and rosters: ESPN. Contracts: ESPN + manual entries.</p>
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-border bg-surface p-3 sm:p-4">
      <p className="display text-[11px] font-bold text-muted">{label}</p>
      <div className="display mt-1 text-2xl font-extrabold tabular-nums sm:text-3xl">{value}</div>
      {sub && <p className="num mt-0.5 text-[11px] text-muted">{sub}</p>}
    </div>
  );
}
