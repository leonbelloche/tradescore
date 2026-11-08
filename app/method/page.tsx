import { Suspense } from "react";
import Link from "next/link";
import ScoreScale from "@/components/ScoreScale";
import { formatDay } from "@/components/trades/TradeRow";
import { Card, SectionTitle } from "@/components/ui";
import { getScoredTrades } from "@/lib/trades/scored";

export default function MethodPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2 pt-2 text-center">
        <h1 className="display text-3xl font-extrabold leading-tight sm:text-4xl">
          How the <span className="text-accent">Trade Score</span> works
        </h1>
        <p className="text-muted">Every team in a trade gets its own score from 1 to 99. 50 means it broke even.</p>
      </header>

      <section className="space-y-3">
        <SectionTitle title="1. Talent" />
        <Card className="space-y-2 p-4 text-sm leading-relaxed">
          <p>
            We start from each player&apos;s <b>Game Score</b>, a public box-score stat (points, shooting, rebounds, assists,
            steals, blocks, turnovers…). We blend <b>60% of this season and 40% of last season</b> — or use last season only
            before 10 games.
          </p>
          <p>
            Game Score becomes <b>Talent</b>, expressed as the share of the salary cap a player is worth. The curve grows
            faster at the top: a Game Score of 12 is worth about 8% of the cap, 20 about 30%, 25 about 48%. Missed games
            lower it.
          </p>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionTitle title="2. Age and contract" />
        <Card className="space-y-2 p-4 text-sm leading-relaxed">
          <p>
            Talent changes every season with age: <b>+8%</b> up to 22, <b>+4%</b> from 23 to 25, flat from 26 to 28, then{" "}
            <b>−5%</b>, <b>−10%</b> and <b>−15%</b> after 33.
          </p>
          <p>
            Over each remaining season of his contract (5 max), a player is worth his talent minus what he costs. Only the
            salary <b>above a minimum contract</b> counts as a cost, and saved money weighs a bit less than talent. Future
            seasons count a little less (×0.9 per year).
          </p>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionTitle title="3. Team context" />
        <Card className="space-y-2 p-4 text-sm leading-relaxed">
          <p>
            A <b>contender</b> (60%+ wins) values winning now: this season counts ×1.5. A <b>rebuilding</b> team (40% or
            less) values the future: this season counts ×0.6, later ones up to ×1.1. Each team judges everything it gets and
            gives with its own context.
          </p>
          <p>
            <b>Draft picks</b> are worth more the higher they should land (from the giving team&apos;s record), less when far
            away or protected. Vague &quot;draft considerations&quot; count as a future 2nd-round pick.
          </p>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionTitle title="4. The score" />
        <Card className="space-y-3 p-4 text-sm leading-relaxed">
          <p>
            We add up what a team gets, subtract what it gives, and turn the difference into a score from 1 to 99 (no trade is perfect, so nobody gets 0 or 100). Two teams
            within 5 points of each other make an <b>even trade</b>. Both teams can win.
          </p>
        </Card>
      </section>

      <ScoreScale title="The grading scale" />

      <section className="space-y-3">
        <SectionTitle title="See it on a real trade" />
        <Suspense fallback={<div className="h-40 animate-pulse rounded-[14px] bg-surface" />}>
          <TradeLinks />
        </Suspense>
      </section>

      <p className="text-center text-xs text-muted">
        Stats: ESPN. Contracts: ESPN and manual entries. Simplified model — it does not know about injuries in progress,
        locker rooms or what a front office was really thinking.
      </p>
    </div>
  );
}

async function TradeLinks() {
  const trades = await getScoredTrades();
  return (
    <Card className="divide-y divide-border">
      {trades.map((t) => (
        <Link key={t.id} href={`/method/${t.id}`} className="flex min-h-11 items-center gap-3 px-4 py-2 hover:bg-surface-2">
          <span className="display w-20 shrink-0 text-xs text-muted">{formatDay(t.date)}</span>
          <span className="display min-w-0 flex-1 truncate font-semibold">
            {t.teams.map((x) => x.team.short_name ?? x.team.name).join(" · ")}
          </span>
          <span className="text-accent" aria-hidden>
            ▸
          </span>
        </Link>
      ))}
    </Card>
  );
}
