import Image from "next/image";
import Link from "next/link";
import ModeBadge from "@/components/ModeBadge";
import ScoreBadge, { GradeChip, TierLabel, scoreTone } from "@/components/ScoreBadge";
import { Record, TeamMark } from "@/components/ui";
import { modeFromRecord } from "@/lib/score";
import type { TeamTradeStats } from "@/lib/trades/scored";

// The best trading team of the season, presented as a trophy card, with the next two below.
export default function TeamSpotlight({ stats }: { stats: TeamTradeStats[] }) {
  const [top, ...rest] = stats;
  if (!top) return null;
  const tone = scoreTone(top.average);
  const t = top.team;

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-accent/50 bg-surface">
      <div className={`pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full opacity-20 blur-3xl ${tone.bg}`} aria-hidden />

      <div className="led relative flex items-center justify-between border-b border-border bg-black/40 px-5 py-3">
        <span className="display flex items-center gap-1.5 rounded bg-accent px-2 py-0.5 text-xs font-extrabold text-black">
          <span aria-hidden>★</span> Best trading team
        </span>
        <span className="num text-xs text-muted">2026-27 season</span>
      </div>

      <Link href={`/team/${t.slug}`} className="group relative flex flex-1 flex-col items-center gap-3 p-5 text-center">
        {/* Big logo on a podium ring */}
        <span className={`relative flex h-28 w-28 items-center justify-center rounded-full border-2 bg-black/40 ${tone.border}`}>
          {t.logo_url ? (
            <Image src={t.logo_url} alt={`${t.name} logo`} width={80} height={80} className="h-20 w-20 object-contain" />
          ) : (
            <TeamMark abbreviation={t.abbreviation} size="lg" />
          )}
          <span className="display absolute -bottom-2 rounded bg-accent px-2 text-xs font-extrabold text-black">#1</span>
        </span>

        <div>
          <h3 className="display text-3xl font-extrabold leading-none group-hover:text-accent sm:text-4xl">{t.name}</h3>
          <div className="mt-2 flex items-center justify-center gap-2">
            <ModeBadge mode={modeFromRecord(t.wins, t.losses)} />
            <TierLabel score={top.average} className="text-sm" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ScoreBadge score={top.average} size="xl" />
          <span className="text-left">
            <GradeChip score={top.average} />
            <span className="display block text-[11px] font-bold text-muted">avg Trade Score</span>
          </span>
        </div>

        <dl className="grid w-full grid-cols-3 gap-2 text-center">
          <Stat label="Trades" value={String(top.trades)} />
          <Stat label="Won-lost" value={`${top.wins}-${top.losses}`} />
          <Stat label="Best deal" value={<ScoreBadge score={top.best.score} />} />
        </dl>
        <Record wins={t.wins} losses={t.losses} size="lg" />
      </Link>

      {rest.length > 0 && (
        <ol className="relative divide-y divide-border border-t border-border">
          {rest.slice(0, 2).map((s, i) => (
            <li key={s.team.id}>
              <Link href={`/team/${s.team.slug}`} className="flex min-h-12 items-center gap-3 px-5 py-2 hover:bg-surface-2">
                <span className="display w-5 text-sm font-extrabold" style={{ color: i === 0 ? "#c9d1dc" : "#d08a4a" }}>#{i + 2}</span>
                <TeamMark abbreviation={s.team.abbreviation} logoUrl={s.team.logo_url} />
                <span className="display min-w-0 flex-1 truncate font-bold">{s.team.name}</span>
                <span className="num text-[11px] text-muted">{s.trades} trade{s.trades > 1 ? "s" : ""}</span>
                <ScoreBadge score={s.average} size="md" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-2 py-2">
      <dd className="display flex h-7 items-center justify-center text-xl font-extrabold tabular-nums">{value}</dd>
      <dt className="display text-[10px] font-bold text-muted">{label}</dt>
    </div>
  );
}
