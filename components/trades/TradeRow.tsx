import Link from "next/link";
import ScoreBadge, { TierLabel } from "@/components/ScoreBadge";
import { Record, TeamMark } from "@/components/ui";
import type { ScoredTeam, ScoredTrade } from "@/lib/trades/scored";

export function formatDay(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

const shortName = (t: ScoredTeam) => t.team.short_name ?? t.team.name;
const gets = (t: ScoredTeam) => t.receives.join(", ") || "nothing counted (cash)";

// One trade as a scoreboard "matchup": TEAM  75 – 25  TEAM. 3-team trades stack one line per team.
export default function TradeRow({ trade }: { trade: ScoredTrade }) {
  const label = trade.teams.length === 3 ? "3-team trade" : trade.winner ? `${shortName(trade.winner)} win` : "Even trade";
  return (
    <Link
      href={`/trade/${trade.id}`}
      className="block min-w-0 rounded-xl border border-border bg-surface p-4 transition hover:border-accent/60 hover:bg-surface-2"
    >
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="num text-muted">{formatDay(trade.date)}</span>
        <span className="display font-bold text-accent">{label}</span>
      </div>

      {trade.teams.length === 2 ? (
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 sm:gap-3">
          <Side team={trade.teams[0]} align="left" />
          <div className="flex items-center gap-1.5 pt-1">
            <ScoreBadge score={trade.teams[0].score} size="md" />
            <span className="text-muted" aria-hidden>
              –
            </span>
            <ScoreBadge score={trade.teams[1].score} size="md" />
          </div>
          <Side team={trade.teams[1]} align="right" />
        </div>
      ) : (
        <ul className="space-y-2">
          {trade.teams.map((t) => (
            <li key={t.team.id} className="flex items-center gap-2.5">
              <TeamMark abbreviation={t.team.abbreviation} logoUrl={t.team.logo_url} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="display truncate text-base font-bold leading-tight">{shortName(t)}</span>
                  <Record wins={t.team.wins} losses={t.team.losses} />
                </span>
                <span className="block truncate text-xs text-muted">Gets {gets(t)}</span>
              </span>
              <TierLabel score={t.score} className="hidden text-sm sm:inline" />
              <ScoreBadge score={t.score} size="md" />
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}

function Side({ team, align }: { team: ScoredTeam; align: "left" | "right" }) {
  const right = align === "right";
  return (
    <div className={`min-w-0 ${right ? "text-right" : ""}`}>
      <div className={`flex items-center gap-2 ${right ? "flex-row-reverse" : ""}`}>
        <TeamMark abbreviation={team.team.abbreviation} logoUrl={team.team.logo_url} />
        <span className="display truncate text-base font-bold leading-tight">{shortName(team)}</span>
      </div>
      <Record wins={team.team.wins} losses={team.team.losses} className="mt-1" />
      <TierLabel score={team.score} className="mt-0.5 block text-xs" />
      <p className="mt-0.5 line-clamp-2 text-xs text-muted">Gets {gets(team)}</p>
    </div>
  );
}
