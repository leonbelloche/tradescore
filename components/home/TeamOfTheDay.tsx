import Image from "next/image";
import Link from "next/link";
import ModeBadge from "@/components/ModeBadge";
import PlayerAvatar from "@/components/players/PlayerAvatar";
import ScoreBadge, { TierLabel, scoreTone } from "@/components/ScoreBadge";
import { Record, TeamMark } from "@/components/ui";
import type { TeamWithRoster } from "@/lib/db/teams";
import { formatMoney } from "@/lib/format";
import type { ValuedPlayer } from "@/lib/players/values";
import { teamMode } from "@/lib/players/values";
import type { SuggestedTrade } from "@/lib/trades/ideas";
import type { TeamTradeStats } from "@/lib/trades/scored";

export type TeamOfTheDayData = {
  team: TeamWithRoster;
  rank: number; // conference rank, 1-15
  conference: string;
  roster: number; // Roster Score 1-99
  rosterRank: number; // 1-30 among all teams
  core: ValuedPlayer[]; // 3 most valuable players
  stats?: TeamTradeStats; // its trades this season, if any
  move: SuggestedTrade | null; // the trade our engine would make for it
};

// A different team every day (all 30 take turns): its record, how good its contracts are, its best players,
// and its trades this season or the move our engine would make.
export default function TeamOfTheDay({ data }: { data: TeamOfTheDayData }) {
  const { team: t, roster, core, stats, move } = data;
  const tone = scoreTone(roster);
  const moveLine =
    move &&
    (move.role === "buy"
      ? `Get ${move.idea.target.name} from the ${move.idea.seller.short_name ?? move.idea.seller.name}`
      : `Sell ${move.idea.target.name} to the ${move.idea.buyer.short_name ?? move.idea.buyer.name}`);

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-surface">
      <div className={`pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full opacity-20 blur-3xl ${tone.bg}`} aria-hidden />

      <div className="led relative flex items-center justify-between border-b border-border bg-black/40 px-5 py-3">
        <span className="display rounded bg-accent px-2 py-0.5 text-xs font-extrabold text-black">Team of the day</span>
        <span className="num text-xs text-muted">
          #{data.rank} in the {data.conference}
        </span>
      </div>

      <Link href={`/team/${t.slug}`} className="group relative flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-center gap-4">
          <span className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 bg-black/40 ${tone.border}`}>
            {t.logo_url ? (
              <Image src={t.logo_url} alt={`${t.name} logo`} width={60} height={60} className="h-14 w-14 object-contain" />
            ) : (
              <TeamMark abbreviation={t.abbreviation} size="lg" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="display text-2xl font-extrabold leading-none group-hover:text-accent sm:text-3xl">{t.name}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ModeBadge mode={teamMode(t)} />
              <Record wins={t.wins} losses={t.losses} />
            </div>
          </div>
          <span className="text-center">
            <ScoreBadge score={roster} size="lg" />
            <span className="display mt-1 block text-[10px] font-bold text-muted">Roster Score</span>
          </span>
        </div>

        <dl className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Contracts rank" value={`#${data.rosterRank}`} />
          <Stat label="Payroll" value={formatMoney(t.payroll)} />
          <Stat label="Trade Score" value={stats ? <ScoreBadge score={stats.average} /> : "–"} />
        </dl>

        <div>
          <p className="display mb-2 text-xs font-bold text-accent">Most valuable</p>
          <ul className="space-y-1.5">
            {core.map((p) => (
              <li key={p.id} className="flex items-center gap-2.5">
                <PlayerAvatar name={p.name} url={p.headshotUrl} />
                <span className="min-w-0 flex-1">
                  <span className="display block truncate text-sm font-bold leading-tight">{p.name}</span>
                  <span className="num block text-[11px] text-muted">
                    {p.position} · {p.age} yrs · {formatMoney(p.salary)}
                  </span>
                </span>
                <ScoreBadge score={p.score} />
              </li>
            ))}
          </ul>
        </div>
      </Link>

      <div className="relative border-t border-border px-5 py-4 text-sm">
        {stats ? (
          <p>
            <span className="display text-xs font-bold text-accent">This season · </span>
            {stats.trades} trade{stats.trades > 1 ? "s" : ""}, {stats.wins} won, {stats.losses} lost: <TierLabel score={stats.average} />
          </p>
        ) : moveLine ? (
          <p>
            <span className="display text-xs font-bold text-accent">Our move for them · </span>
            {moveLine} <span className="text-muted">(Trade Score {move!.score})</span>
          </p>
        ) : (
          <p className="text-muted">No trade yet this season.</p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-2 py-2">
      <dd className="display flex h-7 items-center justify-center text-base font-extrabold tabular-nums">{value}</dd>
      <dt className="display text-[10px] font-bold text-muted">{label}</dt>
    </div>
  );
}
