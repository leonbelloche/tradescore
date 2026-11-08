import { Suspense } from "react";
import Link from "next/link";
import ScoreBadge, { TierLabel } from "@/components/ScoreBadge";
import ScoreScale from "@/components/ScoreScale";
import TeamSpotlight from "@/components/home/TeamSpotlight";
import TradeOfTheWeek, { pickTradeOfTheWeek } from "@/components/home/TradeOfTheWeek";
import TierBar from "@/components/trades/TierBar";
import TradeRow from "@/components/trades/TradeRow";
import { Button, Card, SectionTitle, TeamMark } from "@/components/ui";
import { getValuedPlayers } from "@/lib/players/values";
import { getScoredTrades, teamStats, type TeamTradeStats } from "@/lib/trades/scored";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-[70vh] animate-pulse rounded-2xl bg-surface" />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const [trades, { players }] = await Promise.all([getScoredTrades(), getValuedPlayers()]);

  const hero = (
    <div className="space-y-4">
      <p className="display text-sm font-bold text-accent">NBA · 2026-27 season</p>
      <h1 className="display text-4xl font-extrabold leading-[0.9] sm:text-5xl lg:text-6xl">
        Who won
        <br />
        the <span className="text-accent">trade?</span>
      </h1>
      <p className="max-w-md text-muted">Every NBA trade gets a score from 1 to 99 for each team. Win, lose, or get fleeced.</p>
      <div className="flex flex-wrap gap-3">
        <Button href="/trade">Build a trade ▸</Button>
        <Button href="/method" variant="ghost">
          How it works
        </Button>
      </div>
    </div>
  );

  if (trades.length === 0) {
    return (
      <div className="space-y-8">
        {hero}
        <Card className="p-6 text-center text-muted">No trades yet this season. Real trades show up here as soon as they are imported.</Card>
      </div>
    );
  }

  const stats = teamStats(trades);
  const week = pickTradeOfTheWeek(trades, players);
  const heists = trades
    .flatMap((trade) => trade.teams.map((t) => ({ trade, t })))
    .sort((a, b) => b.t.score - a.t.score)
    .slice(0, 5);

  return (
    <div className="space-y-16">
      <div className="space-y-8 pt-2">
        {hero}
        <section aria-label="This week" className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
          {week && <TradeOfTheWeek trade={week.trade} weekOf={week.weekOf} players={players} />}
          <TeamSpotlight stats={stats} />
        </section>
      </div>

      <ScoreScale />

      <section>
        <SectionTitle index={1} title="Latest trades" sub={`${trades.length} scored`} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {trades.map((trade) => (
            <TradeRow key={trade.id} trade={trade} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          index={2}
          title="GM race"
          live
          action={
            <Link href="/rankings" className="display text-sm font-bold text-accent hover:underline">
              Full rankings ▸
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <GmCard label="Best GM" stat={stats[0]} />
          <GmCard label="Worst GM" stat={stats[stats.length - 1]} />
        </div>
        <Card className="mt-3 p-4">
          <TierBar scores={trades.flatMap((t) => t.teams.map((x) => x.score))} label="How teams fared · all 2026-27 trades" />
        </Card>
      </section>

      <section>
        <SectionTitle index={3} title="Biggest heists" />
        <Card className="divide-y divide-border">
          {heists.map(({ trade, t }, i) => (
            <Link key={`${trade.id}-${t.team.id}`} href={`/trade/${trade.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-surface-2">
              <span className="num w-6 text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
              <TeamMark abbreviation={t.team.abbreviation} logoUrl={t.team.logo_url} />
              <span className="min-w-0 flex-1">
                <span className="display block truncate text-base font-bold leading-tight">{t.team.name}</span>
                <span className="block truncate text-xs text-muted">Got {t.receives.join(", ") || "nothing counted (cash)"}</span>
              </span>
              <TierLabel score={t.score} className="hidden text-sm sm:inline" />
              <ScoreBadge score={t.score} size="md" />
            </Link>
          ))}
        </Card>
      </section>
    </div>
  );
}

function GmCard({ label, stat }: { label: string; stat: TeamTradeStats }) {
  return (
    <Link
      href={`/team/${stat.team.slug}`}
      className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition hover:border-accent/60"
    >
      <TeamMark abbreviation={stat.team.abbreviation} logoUrl={stat.team.logo_url} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="display text-xs font-bold text-accent">{label}</p>
        <p className="display text-xl font-bold leading-tight">{stat.team.name}</p>
        <p className="text-sm">
          <TierLabel score={stat.average} /> <span className="num text-xs text-muted">· {stat.trades} trade{stat.trades > 1 ? "s" : ""}</span>
        </p>
      </div>
      <ScoreBadge score={stat.average} size="lg" />
    </Link>
  );
}
