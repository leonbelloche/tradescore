import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import ModeBadge from "@/components/ModeBadge";
import PlayerAvatar from "@/components/players/PlayerAvatar";
import ScoreBadge, { TierLabel } from "@/components/ScoreBadge";
import { formatDay } from "@/components/trades/TradeRow";
import { Card, Record, SectionTitle, TeamMark } from "@/components/ui";
import { todayEastern } from "@/lib/daily";
import type { TeamWithRoster } from "@/lib/db/teams";
import { formatMoney } from "@/lib/format";
import { getValuedPlayers, teamMode, type ValuedPlayer } from "@/lib/players/values";
import { suggestedTrade, type SuggestedTrade } from "@/lib/trades/ideas";

export const metadata: Metadata = {
  title: "The Trade Block — Trade Score",
  description: "Every NBA team's best trade, according to the Trade Score engine: who winning teams should get, who losing teams should sell.",
};

export default function BlockPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="display text-sm font-bold text-accent">Only on Trade Score · recalculated every day</p>
        <h1 className="display text-4xl font-extrabold leading-[1.02] sm:text-5xl">The Trade Block</h1>
        <p className="max-w-2xl text-muted">
          Our engine plays GM for all 30 teams. Winning teams buy the deal that grades best for them, losing teams sell their best player to
          whoever pays the most. Real rosters, salaries checked. <b className="text-foreground">Our picks, not rumors.</b>
        </p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <Block />
      </Suspense>
    </div>
  );
}

type Move = { team: TeamWithRoster; move: SuggestedTrade };

async function Block() {
  const [{ league, teams, players }, today] = await Promise.all([getValuedPlayers(), todayEastern()]);
  const moves: Move[] = teams
    .map((team) => ({ team, move: suggestedTrade(team, league, teams, players) }))
    .filter((m): m is Move => m.move !== null)
    .sort((a, b) => b.move.score - a.move.score);
  const buyers = moves.filter((m) => m.move.role === "buy");
  const sellers = moves.filter((m) => m.move.role === "sell");

  // Most wanted: the players our engine sends somewhere most often.
  const wanted = new Map<string, { player: ValuedPlayer; teams: TeamWithRoster[] }>();
  for (const m of moves) {
    const p = m.move.idea.target;
    const into = m.move.idea.buyer;
    const entry = wanted.get(p.id) ?? { player: p, teams: [] };
    if (!entry.teams.some((t) => t.id === into.id)) entry.teams.push(into);
    wanted.set(p.id, entry);
  }
  const mostWanted = [...wanted.values()].sort((a, b) => b.teams.length - a.teams.length || b.player.score - a.player.score).slice(0, 5);

  return (
    <>
      <section>
        <SectionTitle title="Most wanted" sub={formatDay(today)} live />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {mostWanted.map(({ player: p, teams: into }, i) => (
            <Link key={p.id} href={`/player/${p.slug}`} className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center hover:border-accent/60">
              <span className="num self-start text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
              <PlayerAvatar name={p.name} url={p.headshotUrl} size="md" />
              <span className="display font-bold leading-tight">{p.name}</span>
              <span className="num text-[11px] text-muted">
                {p.team.abbreviation} · {formatMoney(p.salary)}
              </span>
              <ScoreBadge score={p.score} />
              <span className="flex flex-wrap justify-center gap-1">
                {into.map((t) => (
                  <TeamMark key={t.id} abbreviation={t.abbreviation} logoUrl={t.logo_url} />
                ))}
              </span>
              <span className="text-[11px] text-muted">
                {into.length} team{into.length > 1 ? "s" : ""} should go get him
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-6">
        <section className="min-w-0">
          <SectionTitle index={1} title="Buyers" sub="winning teams: who to get" />
          <ul className="space-y-3">
            {buyers.map((m) => (
              <li key={m.team.id}>
                <MoveCard {...m} />
              </li>
            ))}
          </ul>
        </section>
        <section className="min-w-0">
          <SectionTitle index={2} title="Sellers" sub="losing teams: who to sell" />
          <ul className="space-y-3">
            {sellers.map((m) => (
              <li key={m.team.id}>
                <MoveCard {...m} />
              </li>
            ))}
          </ul>
        </section>
      </div>
      <p className="text-xs text-muted">
        Each deal: the star goes one way, salary filler and a future 1st go the other, salary rules checked. The badge is the Trade Score of the deal for
        the team on the card. Teams with no deal that fits are left out.
      </p>
    </>
  );
}

// One team's move: who it gets (or sells), to whom, what it gives, and the grade.
function MoveCard({ team, move }: Move) {
  const { idea, role } = move;
  const partner = role === "buy" ? idea.seller : idea.buyer;
  const mine = role === "buy" ? idea.buyerResult : idea.sellerResult;
  const p = idea.target;
  return (
    <Card className="overflow-hidden">
      <Link href={`/team/${team.slug}`} className="flex items-center gap-2.5 border-b border-border bg-surface-2 px-4 py-2 hover:text-accent">
        <TeamMark abbreviation={team.abbreviation} logoUrl={team.logo_url} />
        <span className="display min-w-0 flex-1 truncate font-extrabold">{team.name}</span>
        <ModeBadge mode={teamMode(team)} />
        <Record wins={team.wins} losses={team.losses} />
      </Link>
      <div className="flex items-center gap-3 p-4">
        <PlayerAvatar name={p.name} url={p.headshotUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="display text-xs font-bold text-accent">
            {role === "buy" ? "Go get" : "Sell"} · {role === "buy" ? "from" : "to"} the {partner.short_name ?? partner.name}
          </p>
          <Link href={`/player/${p.slug}`} className="display block truncate text-lg font-extrabold leading-tight hover:text-accent">
            {p.name}
          </Link>
          <p className="truncate text-xs text-muted">
            {role === "buy" ? "Gives" : "Gets"} {(role === "buy" ? mine.sent : mine.received).map((d) => d.label).join(", ")}
          </p>
        </div>
        <span className="text-center">
          <ScoreBadge score={mine.score} size="md" />
          <TierLabel score={mine.score} className="block text-[11px]" />
        </span>
      </div>
    </Card>
  );
}
