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
  const { teams, players } = await getValuedPlayers();
  const signed = players.filter((p) => p.hasContract);
  const bargains = signed.filter((p) => p.salary < 15_000_000).slice(0, 5);
  const overpaid = [...signed].sort((a, b) => a.value - b.value).slice(0, 5);

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-3">
        <Spotlight title="Most valuable" hint="best Trade Value" players={players.slice(0, 5)} />
        <Spotlight title="Best bargains" hint="paid under $15M" players={bargains} />
        <Spotlight title="Most overpaid" hint="lowest Trade Value" players={overpaid} />
      </section>
      <section>
        <SectionTitle index={1} title="Every player" sub={`${players.length}`} />
        <PlayersExplorer
          players={players}
          teams={[...teams].sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({ abbreviation: t.abbreviation, name: t.name }))}
        />
        <p className="mt-3 text-xs text-muted">Stats and rosters: ESPN. Players with no contract data count as $0, so their value reads too high.</p>
      </section>
    </>
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
