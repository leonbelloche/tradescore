import Link from "next/link";
import PlayerAvatar from "@/components/players/PlayerAvatar";
import ScoreBadge, { GradeChip, TierLabel, scoreTone } from "@/components/ScoreBadge";
import { formatDay } from "@/components/trades/TradeRow";
import { Record, TeamMark } from "@/components/ui";
import type { ValuedPlayer } from "@/lib/players/values";
import { reasonsFor } from "@/lib/score";
import type { ScoredTrade } from "@/lib/trades/scored";
import { ofTheDay } from "@/lib/daily";


// Best player (highest Trade Value, contract known) that changed teams in a trade.
function starOf(trade: ScoredTrade, players: ValuedPlayer[]): ValuedPlayer | undefined {
  const ids = new Set(trade.teams.flatMap((t) => t.result.received.filter((d) => d.asset.kind === "player").map((d) => d.asset.id)));
  return players.filter((p) => ids.has(p.id) && p.hasContract).sort((a, b) => b.score - a.score)[0];
}

// The trade of the day: a different deal every day, so the home page moves even when no new trade happens.
// All trades are ranked (best player moved first, then the biggest winning score) and the day picks one in turn,
// so the best deals come back most often in the rotation order.
// `chosen` = trade slug picked by the admin (Settings), used instead when it still exists. `today` = YYYY-MM-DD (New York).
export function pickTradeOfTheDay(trades: ScoredTrade[], players: ValuedPlayer[], today: string, chosen?: string | null): ScoredTrade | null {
  if (trades.length === 0) return null;
  const picked = chosen ? trades.find((t) => t.id === chosen) : undefined;
  if (picked) return picked;
  const rank = (t: ScoredTrade) => (starOf(t, players)?.score ?? 0) * 100 + Math.max(...t.teams.map((x) => x.score));
  const ranked = [...trades].sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id));
  return ofTheDay(ranked, today) ?? null;
}

// Big card: the star the winning team landed (headshot), the scoreboard of the trade, and why.
export default function TradeOfTheDay({ trade, today, players }: { trade: ScoredTrade; today: string; players: ValuedPlayer[] }) {
  const winner = trade.winner ?? trade.teams[0];
  const star = starOf(trade, players);
  const from = star ? trade.teams.find((t) => t.result.sent.some((d) => d.asset.id === star.id)) : undefined;
  const to = star ? trade.teams.find((t) => t.result.received.some((d) => d.asset.id === star.id)) : undefined;
  const why = reasonsFor(winner.result).slice(0, 2);
  const tone = scoreTone(winner.score);

  return (
    <Link
      href={`/trade/${trade.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-surface transition hover:border-accent"
    >
      {/* Glow in the winner's tier color */}
      <div className={`pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-20 blur-3xl ${tone.bg}`} aria-hidden />

      <div className="led relative flex items-center justify-between border-b border-border bg-black/40 px-5 py-3">
        <span className="display rounded bg-accent px-2 py-0.5 text-xs font-extrabold text-black">Trade of the day</span>
        <span className="num text-xs text-muted">{formatDay(today)} · traded {formatDay(trade.date.slice(0, 10))}</span>
      </div>

      <div className="relative flex flex-1 flex-col gap-5 p-5">
        {/* The star of the deal */}
        <div className="flex items-center gap-4">
          {star ? (
            <PlayerAvatar name={star.name} url={star.headshotUrl} size="lg" />
          ) : (
            <TeamMark abbreviation={winner.team.abbreviation} logoUrl={winner.team.logo_url} size="lg" />
          )}
          <div className="min-w-0 flex-1">
            <p className="display text-xs font-bold text-muted">{star ? (star.score >= 60 ? "Star of the deal" : "Key player") : "The winner"}</p>
            <h3 className="display truncate text-3xl font-extrabold leading-[1.05] sm:text-4xl">{star?.name ?? winner.team.name}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted">
              {star && from && to ? (
                <>
                  <TeamMark abbreviation={from.team.abbreviation} logoUrl={from.team.logo_url} />
                  <span aria-hidden>▸</span>
                  <TeamMark abbreviation={to.team.abbreviation} logoUrl={to.team.logo_url} />
                  <span className="display font-bold text-foreground">to the {to.team.short_name ?? to.team.name}</span>
                </>
              ) : (
                <span>{formatDay(trade.date)}</span>
              )}
            </p>
          </div>
          {star && (
            <div className="hidden text-center sm:block">
              <ScoreBadge score={star.score} size="md" />
              <span className="display block text-[10px] font-bold text-muted">Trade Value</span>
            </div>
          )}
        </div>

        {/* Scoreboard of the trade */}
        <div className="led grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-2 rounded-xl border border-border bg-black/50 p-3">
          {trade.teams.map((t) => (
            <div key={t.team.id} className="flex min-w-0 flex-col items-center gap-1 text-center">
              <span className="flex items-center gap-1.5">
                <TeamMark abbreviation={t.team.abbreviation} logoUrl={t.team.logo_url} />
                <span className="display truncate text-sm font-bold">{t.team.short_name ?? t.team.name}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <ScoreBadge score={t.score} size="lg" />
                <GradeChip score={t.score} />
              </span>
              <TierLabel score={t.score} className="text-xs" />
              <Record wins={t.team.wins} losses={t.team.losses} />
            </div>
          ))}
        </div>

        {/* Why */}
        <div className="border-l-2 border-accent pl-3 text-sm">
          <p className="display text-xs font-bold text-accent">Why {winner.team.short_name ?? winner.team.name} win it</p>
          {why.map((r) => (
            <p key={r} className="text-muted">{r}</p>
          ))}
        </div>

        <span className="display mt-auto text-sm font-bold text-accent group-hover:underline">Full breakdown ▸</span>
      </div>
    </Link>
  );
}
