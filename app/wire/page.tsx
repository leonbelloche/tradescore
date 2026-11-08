import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import ScoreBadge, { TierLabel } from "@/components/ScoreBadge";
import { formatDay } from "@/components/trades/TradeRow";
import { Card, Record, TeamMark } from "@/components/ui";
import { reasonsFor } from "@/lib/score";
import { getScoredTrades, type ScoredTrade } from "@/lib/trades/scored";

export const metadata: Metadata = {
  title: "Trade Wire — Trade Score",
  description: "Every NBA trade of the season as it happened, with the Trade Score take on who won.",
};

export default function WirePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="display text-sm font-bold text-accent">Every deal, as it happened</p>
        <h1 className="display text-4xl font-extrabold leading-[0.9] sm:text-5xl">Trade Wire</h1>
        <p className="max-w-xl text-muted">The season&apos;s trades, newest first, each with our take in two lines.</p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <Wire />
      </Suspense>
    </div>
  );
}

// One-line headline from the result, e.g. "Spurs pull off a heist".
function headline(t: ScoredTrade): string {
  const w = t.winner;
  if (!w) return "Even swap: nobody wins this one";
  const name = w.team.short_name ?? w.team.name;
  if (w.score > 79) return `${name} pull off a heist`;
  if (w.score > 59) return `${name} win the trade`;
  return `Close call, slight edge ${name}`;
}

async function Wire() {
  const trades = await getScoredTrades();
  const byMonth = new Map<string, ScoredTrade[]>();
  for (const t of trades) {
    const month = new Date(`${t.date}T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    byMonth.set(month, [...(byMonth.get(month) ?? []), t]);
  }

  return (
    <div className="space-y-10">
      {[...byMonth].map(([month, list]) => (
        <section key={month}>
          <h2 className="display mb-4 flex items-center gap-3 text-xl font-bold">
            {month}
            <span className="num text-xs font-normal text-muted">{list.length} trade{list.length > 1 ? "s" : ""}</span>
            <span className="h-px flex-1 bg-border" aria-hidden />
          </h2>
          <ol className="relative space-y-4 border-l border-border pl-5 sm:pl-6">
            {list.map((t) => {
              const loser = t.winner ? t.teams[t.teams.length - 1] : null;
              const take = [t.winner ? reasonsFor(t.winner.result)[0] : null, loser ? reasonsFor(loser.result)[0] : null].filter(Boolean);
              return (
                <li key={t.id} className="relative">
                  <span className="absolute -left-[25px] top-5 h-2.5 w-2.5 rounded-full border-2 border-background bg-accent sm:-left-[29px]" aria-hidden />
                  <Card className="p-4 sm:p-5">
                    <p className="num text-xs text-muted">{formatDay(t.date)}</p>
                    <h3 className="display mt-1 text-xl font-extrabold leading-tight sm:text-2xl">
                      <Link href={`/trade/${t.id}`} className="hover:text-accent">{headline(t)}</Link>
                    </h3>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {t.teams.map((x) => (
                        <li key={x.team.id} className="flex min-w-0 items-start gap-2.5 rounded-lg bg-surface-2 p-2.5">
                          <TeamMark abbreviation={x.team.abbreviation} logoUrl={x.team.logo_url} />
                          <span className="min-w-0 flex-1 text-sm">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="display font-bold">{x.team.short_name ?? x.team.name}</span>
                              <Record wins={x.team.wins} losses={x.team.losses} />
                              <TierLabel score={x.score} className="text-xs" />
                            </span>
                            <span className="block truncate text-xs text-muted">Gets {x.receives.join(", ") || "nothing counted (cash)"}</span>
                          </span>
                          <ScoreBadge score={x.score} size="md" />
                        </li>
                      ))}
                    </ul>
                    {take.length > 0 && (
                      <div className="mt-3 border-l-2 border-accent pl-3 text-sm">
                        <p className="display text-xs font-bold text-accent">Trade Score take</p>
                        {take.map((line) => (
                          <p key={line} className="text-muted">{line}</p>
                        ))}
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
