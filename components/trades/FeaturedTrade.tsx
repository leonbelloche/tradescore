import Link from "next/link";
import { TierLabel, scoreTone } from "@/components/ScoreBadge";
import { formatDay } from "@/components/trades/TradeRow";
import { TeamMark } from "@/components/ui";
import type { ScoredTrade } from "@/lib/trades/scored";

// Big arena-scoreboard panel for one trade (used for "Trade of the season").
export default function FeaturedTrade({ trade, label }: { trade: ScoredTrade; label: string }) {
  return (
    <Link
      href={`/trade/${trade.id}`}
      className="led block overflow-hidden rounded-2xl border border-border-strong bg-black p-4 transition hover:border-accent sm:p-5"
    >
      <div className="flex items-center justify-between">
        <span className="display rounded bg-accent px-2 py-0.5 text-xs font-extrabold text-black">{label}</span>
        <span className="num text-xs text-muted">{formatDay(trade.date)}</span>
      </div>
      <div className={`mt-4 grid gap-3 ${trade.teams.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {trade.teams.map((t) => (
          <div key={t.team.id} className="flex flex-col items-center text-center">
            <TeamMark abbreviation={t.team.abbreviation} logoUrl={t.team.logo_url} size="lg" />
            <span className="display mt-1 text-lg font-extrabold leading-tight">{t.team.short_name ?? t.team.name}</span>
            <span className={`display text-7xl font-black leading-none tabular-nums sm:text-8xl ${scoreTone(t.score).text}`}>{t.score}</span>
            <TierLabel score={t.score} className="text-sm" />
          </div>
        ))}
      </div>
      <p className="mt-3 truncate text-center text-xs text-muted">
        {trade.teams.map((t) => `${t.team.abbreviation} get ${t.receives.slice(0, 2).join(", ") || "cash"}`).join(" · ")}
      </p>
    </Link>
  );
}
