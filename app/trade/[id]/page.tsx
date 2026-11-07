import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import LoadingBlock from "@/components/LoadingBlock";
import { formatDay } from "@/components/trades/TradeRow";
import ResultCard from "@/components/trades/ResultCard";
import { Button } from "@/components/ui";
import { getScoredTrades } from "@/lib/trades/scored";

export default function TradeResultPage(props: PageProps<"/trade/[id]">) {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <TradeResult params={props.params} />
    </Suspense>
  );
}

async function TradeResult({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trade = (await getScoredTrades()).find((t) => t.id === id);
  if (!trade) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/" className="display text-sm font-semibold text-muted hover:text-foreground">
        ◂ All trades
      </Link>

      {/* Headline */}
      <header className="text-center">
        <p className="display text-sm font-semibold tracking-[0.12em] text-muted">
          Trade score · {formatDay(trade.date)}
          {trade.teams.length === 3 ? " · 3-team trade" : ""}
        </p>
        <h1 className="display mt-1 text-4xl font-bold leading-[0.95] sm:text-5xl">
          {trade.winner ? (
            <>
              <span className="text-accent">{trade.winner.team.short_name ?? trade.winner.team.name}</span>
              <br />
              win the trade
            </>
          ) : (
            "Even trade"
          )}
        </h1>
      </header>

      {/* One card per team, best first */}
      <div className="space-y-3">
        {trade.teams.map((t) => (
          <ResultCard
            key={t.team.id}
            team={{
              name: t.team.name,
              abbreviation: t.team.abbreviation,
              logoUrl: t.team.logo_url,
              href: `/team/${t.team.slug}`,
              record: `${t.team.wins}-${t.team.losses}`,
            }}
            result={t.result}
          />
        ))}
      </div>

      {trade.warnings.length > 0 && (
        <div className="rounded-[14px] border border-score-3/40 bg-score-3/10 p-4 text-sm" role="note">
          <p className="display mb-1 font-semibold text-score-3">Data warning</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {trade.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {trade.source && (
        <div className="text-xs text-muted">
          <p className="display mb-1 font-semibold tracking-[0.06em]">As reported by ESPN</p>
          {trade.source.split("\n").map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Button href="/trade">Build your own trade ▸</Button>
        <Button href={`/method/${trade.id}`} variant="ghost">
          How is it scored?
        </Button>
      </div>
    </div>
  );
}
