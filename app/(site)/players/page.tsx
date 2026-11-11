import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import PlayerAvatar from "@/components/players/PlayerAvatar";
import PlayersExplorer from "@/components/players/PlayersExplorer";
import ScoreBadge from "@/components/ScoreBadge";
import ScoreScale from "@/components/ScoreScale";
import { Card, SectionTitle } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { getValuedPlayers, type ValuedPlayer } from "@/lib/players/values";
import { ofTheDay, todayEastern } from "@/lib/daily";
import { formatDay } from "@/components/trades/TradeRow";

export const metadata: Metadata = {
  title: "Players — Trade Score",
  description: "Every NBA player's Trade Value (1-99): what he would be worth in a trade, contract included.",
};

export default function PlayersPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="display text-sm font-bold text-accent">2026-27 season</p>
        <h1 className="display text-4xl font-extrabold leading-[1.02] sm:text-5xl">Player values</h1>
        <p className="max-w-xl text-muted">
          Trade Value (1-99) = the Trade Score a team would get for acquiring the player for nothing. 50 = fair contract,
          above = worth more than he is paid, below = overpaid.{" "}
          <Link href="/method" className="text-accent underline-offset-2 hover:underline">How it works</Link>
        </p>
        <div className="max-w-xl pt-2">
          <ScoreScale compact />
        </div>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <Players />
      </Suspense>
    </div>
  );
}

async function Players() {
  const [{ teams, players }, today] = await Promise.all([getValuedPlayers(), todayEastern()]);
  // Only players with a known contract who actually play (60%+ of games): no injured stars or $0 contracts in the lists.
  const playing = players.filter((p) => p.hasContract && p.availability >= 0.6);
  const bargains = playing.filter((p) => p.salary < 15_000_000).slice(0, 5);
  const overpaid = [...playing].sort((a, b) => a.value - b.value).slice(0, 5);
  const hurt = players.filter((p) => p.hasContract && p.availability < 0.6 && p.gameScore >= 15).slice(0, 5);
  // Player of the day: the 60 most valuable players take turns.
  const star = ofTheDay(playing.slice(0, 60), today, 3);

  return (
    <>
      {star && <PlayerOfTheDay player={star} today={today} />}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Spotlight title="Most valuable" hint="best Trade Value" players={playing.slice(0, 5)} />
        <Spotlight title="Best bargains" hint="paid under $15M" players={bargains} />
        <Spotlight title="Most overpaid" hint="healthy, lowest Trade Value" players={overpaid} />
        <Spotlight title="Hurt by injuries" hint="good players missing games" players={hurt} />
      </section>
      <section>
        <SectionTitle index={1} title="Every player" sub={`${players.length}`} />
        <PlayersExplorer
          players={players}
          teams={[...teams].sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({ abbreviation: t.abbreviation, name: t.name }))}
        />
        <p className="mt-3 text-xs text-muted">
          Stats and rosters: ESPN, updated every day. A player who misses games loses value (only the games he plays count), so injured stars read low.
          Players with no contract data count as $0, so their value reads too high.
        </p>
      </section>
    </>
  );
}

// Big card for the player of the day: headshot, team, Trade Value and what he is worth to each kind of team.
function PlayerOfTheDay({ player: p, today }: { player: ValuedPlayer; today: string }) {
  return (
    <Link href={`/player/${p.slug}`} className="group block overflow-hidden rounded-2xl border border-border-strong bg-surface hover:border-accent">
      <div className="led flex items-center justify-between border-b border-border bg-black/40 px-5 py-3">
        <span className="display rounded bg-accent px-2 py-0.5 text-xs font-extrabold text-black">Player of the day</span>
        <span className="num text-xs text-muted">{formatDay(today)}</span>
      </div>
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-4">
          <PlayerAvatar name={p.name} url={p.headshotUrl} size="lg" />
          <div className="min-w-0">
            <h2 className="display text-3xl font-extrabold leading-none group-hover:text-accent sm:text-4xl">{p.name}</h2>
            <p className="num mt-2 text-sm text-muted">
              {p.team.name} · {p.position} · {p.age} yrs · {formatMoney(p.salary)} × {p.yearsLeft} yr{p.yearsLeft > 1 ? "s" : ""}
            </p>
            <p className="num mt-1 text-sm">Game Score {p.gameScore.toFixed(1)} · plays {Math.round(p.availability * 100)}% of games</p>
          </div>
        </div>
        <div className="flex items-end gap-4">
          {(["contender", "middle", "rebuild"] as const).map((m) => (
            <span key={m} className="text-center">
              <ScoreBadge score={p.byMode[m]} size={m === "middle" ? "lg" : "md"} />
              <span className="display mt-1 block text-[10px] font-bold text-muted">{m === "middle" ? "Trade Value" : m === "contender" ? "to a contender" : "to a rebuild"}</span>
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function Spotlight({ title, hint, players }: { title: string; hint: string; players: ValuedPlayer[] }) {
  return (
    <Card className="p-4">
      <h2 className="display text-lg font-extrabold leading-none">{title}</h2>
      <p className="display mt-1 text-xs font-bold text-muted">{hint}</p>
      <ol className="mt-3 divide-y divide-border/60">
        {players.map((p, i) => (
          <li key={p.id}>
            <Link href={`/player/${p.slug}`} className="flex min-h-12 items-center gap-2.5 py-1.5 hover:text-accent">
              <span className="num w-4 text-xs text-muted">{i + 1}</span>
              <PlayerAvatar name={p.name} url={p.headshotUrl} />
              <span className="min-w-0 flex-1">
                <span className="display block truncate font-bold leading-tight">{p.name}</span>
                <span className="num block text-[11px] text-muted">
                  {p.team.abbreviation} · {formatMoney(p.salary)}
                </span>
              </span>
              <ScoreBadge score={p.score} />
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
