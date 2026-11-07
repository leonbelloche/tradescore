import Link from "next/link";
import ScoreBadge, { TierLabel } from "@/components/ScoreBadge";
import { TeamMark } from "@/components/ui";
import type { ScoredTrade } from "@/lib/trades/scored";

export function formatDay(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// One trade in a list: each team on its own line with its Trade Score.
export default function TradeRow({ trade }: { trade: ScoredTrade }) {
  return (
    <Link
      href={`/trade/${trade.id}`}
      className="block rounded-[10px] px-3 py-2.5 transition hover:bg-surface-2"
    >
      <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
        <span className="display font-medium">{formatDay(trade.date)}</span>
        <span className="display font-medium">
          {trade.teams.length === 3 ? "3-team trade" : trade.winner ? "" : "Even trade"}
        </span>
      </div>
      <ul className="space-y-1.5">
        {trade.teams.map((t) => (
          <li key={t.team.id} className="flex items-center gap-2.5">
            <TeamMark abbreviation={t.team.abbreviation} logoUrl={t.team.logo_url} />
            <span className="min-w-0 flex-1">
              <span
                className={`display block truncate text-[15px] font-semibold leading-tight ${
                  trade.winner?.team.id === t.team.id ? "underline decoration-accent decoration-2 underline-offset-4" : ""
                }`}
              >
                {t.team.short_name ?? t.team.name}
              </span>
              <span className="block truncate text-[11px] text-muted">Gets {t.receives.join(", ")}</span>
            </span>
            <TierLabel score={t.score} className="hidden text-xs sm:inline" />
            <ScoreBadge score={t.score} />
          </li>
        ))}
      </ul>
    </Link>
  );
}
