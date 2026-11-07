import { Suspense } from "react";
import Link from "next/link";
import ScoreBadge, { TierLabel, scoreTone } from "@/components/ScoreBadge";
import TradeRow from "@/components/trades/TradeRow";
import { Card, SectionTitle, TeamMark } from "@/components/ui";
import { TIERS, tierFor } from "@/lib/score";
import { getScoredTrades, teamStats, type TeamTradeStats } from "@/lib/trades/scored";

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="pt-2 text-center">
        <h1 className="display text-[2.6rem] font-bold leading-[0.95] sm:text-6xl">
          Who won
          <br />
          the <span className="text-accent">trade?</span>
        </h1>
        <div className="mt-4 inline-flex overflow-hidden rounded-lg border border-border-strong text-xs sm:text-sm">
          <Link href="/method" className="display bg-foreground px-3 py-1.5 font-bold text-surface">
            How does it work?
          </Link>
          <Link href="/trade" className="display px-3 py-1.5 font-bold hover:text-accent">
            Build a trade ▸
          </Link>
        </div>
      </section>

      <Suspense fallback={<div className="h-96 animate-pulse rounded-[14px] bg-surface" />}>
        <Season />
      </Suspense>
    </div>
  );
}

async function Season() {
  const trades = await getScoredTrades();
  if (trades.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="display text-xl font-bold">No trades yet this season</p>
        <p className="mt-1 text-sm text-muted">Real trades show up here as soon as they are imported.</p>
        <Link href="/trade" className="display mt-4 inline-flex min-h-11 items-center rounded-lg bg-accent px-5 font-bold text-black">
          Build your own trade ▸
        </Link>
      </Card>
    );
  }
  const stats = teamStats(trades);
  const half = Math.ceil(trades.length / 2);
  const heists = trades
    .flatMap((trade) => trade.teams.map((t) => ({ trade, t })))
    .sort((a, b) => b.t.score - a.t.score)
    .slice(0, 5);

  return (
    <>
      {/* Latest trades */}
      <section>
        <SectionTitle title="Latest trades" sub="2026-27" />
        <div className="grid gap-3 md:grid-cols-2">
          {[trades.slice(0, half), trades.slice(half)].map((column, i) => (
            <Card key={i} className="p-2">
              <div className="display flex justify-between px-3 pb-1 pt-1 text-[11px] font-semibold text-muted">
                <span>Trade</span>
                <span>Trade score</span>
              </div>
              <div className="divide-y divide-border">
                {column.map((trade) => (
                  <TradeRow key={trade.id} trade={trade} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Teams: best and worst trader */}
      <section>
        <SectionTitle title="Teams" sub="2026-27" live />
        <Card className="space-y-3 p-3 sm:p-4">
          <TraderCard label="Best trader" stat={stats[0]} />
          <TraderCard label="Worst trader" stat={stats[stats.length - 1]} />
          <TierBar scores={trades.flatMap((t) => t.teams.map((x) => x.score))} label="Trade tiers · NBA 2026-27 · Teams" />
        </Card>
      </section>

      {/* Biggest heists */}
      <section>
        <SectionTitle title="Biggest heists" sub="2026-27" />
        <Card className="divide-y divide-border">
          {heists.map(({ trade, t }, i) => (
            <Link
              key={`${trade.id}-${t.team.id}`}
              href={`/trade/${trade.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2"
            >
              <span className="display w-7 text-lg font-bold text-muted">#{i + 1}</span>
              <TeamMark abbreviation={t.team.abbreviation} logoUrl={t.team.logo_url} />
              <span className="min-w-0 flex-1">
                <span className="display block truncate font-semibold">{t.team.name}</span>
                <span className="block truncate text-xs text-muted">Got {t.receives.join(", ") || "nothing counted (cash)"}</span>
              </span>
              <TierLabel score={t.score} className="hidden text-sm sm:inline" />
              <ScoreBadge score={t.score} size="md" />
            </Link>
          ))}
        </Card>
      </section>
    </>
  );
}

function TraderCard({ label, stat }: { label: string; stat: TeamTradeStats }) {
  return (
    <Link
      href={`/team/${stat.team.slug}`}
      className="flex items-center gap-4 rounded-[12px] border border-border bg-surface-2 px-4 py-4 hover:border-border-strong"
    >
      <div className="min-w-0 flex-1">
        <p className="display text-sm font-semibold tracking-[0.08em] text-muted">{label}</p>
        <div className="mt-1 flex items-center gap-3">
          <TeamMark abbreviation={stat.team.abbreviation} logoUrl={stat.team.logo_url} size="lg" />
          <div className="min-w-0">
            <p className="display text-xl font-bold leading-tight sm:text-2xl">{stat.team.name}</p>
            <p className="text-sm">
              <TierLabel score={stat.average} /> <span className="text-muted">· {stat.trades} trades</span>
            </p>
          </div>
        </div>
      </div>
      <ScoreBadge score={stat.average} size="lg" />
    </Link>
  );
}

// Share of results in each tier, as one segmented bar.
function TierBar({ scores, label }: { scores: number[]; label: string }) {
  const tiers = TIERS.map((tier, i) => {
    const min = i === 0 ? 0 : TIERS[i - 1].max + 1;
    const count = scores.filter((s) => tierFor(s) === tier.label).length;
    return { label: tier.label, sample: min, pct: Math.round((count / scores.length) * 100) };
  }).filter((t) => t.pct > 0);

  return (
    <div className="pt-1">
      <p className="display mb-2 text-xs font-semibold tracking-[0.06em] text-muted">{label}</p>
      <div className="flex gap-1">
        {tiers.map((t) => (
          <div key={t.label} style={{ flex: t.pct }} className={`h-1 rounded-full ${scoreTone(t.sample).bg}`} />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs">
        {tiers.map((t) => (
          <span key={t.label} className="whitespace-nowrap">
            <TierLabel score={t.sample} /> <span className="text-muted">{t.pct}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}
