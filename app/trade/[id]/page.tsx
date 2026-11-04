import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import LoadingBlock from "@/components/LoadingBlock";
import ScoreBadge, { TierLabel, scoreTone } from "@/components/ScoreBadge";
import { formatDay } from "@/components/trades/TradeRow";
import { Card, TeamMark } from "@/components/ui";
import { getScoredTrades } from "@/lib/trades/scored";

const MODE_LABEL = { contender: "Contender", middle: "Middle of the pack", rebuild: "Rebuilding" } as const;

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

  const shortName = (name: string) => name.split(" ").slice(-1)[0];

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
              <span className="text-accent">{shortName(trade.winner.team.name)}</span>
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
          <Card key={t.team.id} className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              <TeamMark abbreviation={t.team.abbreviation} size="lg" />
              <div className="min-w-0 flex-1">
                <Link href={`/team/${t.team.slug}`} className="display block text-xl font-bold leading-tight hover:text-accent sm:text-2xl">
                  {t.team.name}
                </Link>
                <p className="text-sm">
                  <TierLabel score={t.score} className="text-base" />
                  <span className="text-muted">
                    {" "}
                    · {MODE_LABEL[t.mode]} ({t.team.wins}-{t.team.losses})
                  </span>
                </p>
              </div>
              <ScoreBadge score={t.score} size="xl" />
            </div>

            {/* 0-100 bar with the 50 mark */}
            <div className="relative h-1.5 rounded-full bg-background">
              <div className={`h-1.5 rounded-full ${scoreTone(t.score).bg}`} style={{ width: `${t.score}%` }} />
              <div className="absolute -inset-y-1 left-1/2 w-px bg-muted/70" />
            </div>

            <div>
              <p className="display text-xs font-semibold tracking-[0.08em] text-muted">Gets</p>
              <ul className="mt-1 space-y-0.5">
                {t.receives.map((name) => (
                  <li key={name} className="display text-lg font-semibold">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Link href="/trade" className="display rounded-lg bg-accent px-5 py-2.5 font-bold text-black hover:brightness-110">
          Build your own trade ▸
        </Link>
        <Link href="/method" className="display rounded-lg border border-border-strong px-5 py-2.5 font-bold hover:border-accent">
          How is it scored?
        </Link>
      </div>
      <p className="text-center text-xs text-muted">Demo trade between fictional teams.</p>
    </div>
  );
}
