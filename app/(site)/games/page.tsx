import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import ScoreBadge from "@/components/ScoreBadge";
import { Card, TeamMark } from "@/components/ui";
import { getScoreboard, shiftDay, type Game, type GameTeam } from "@/lib/nba/scoreboard";
import { getValuedPlayers, rosterScores } from "@/lib/players/values";
import { getScoredTrades, teamStats, type TeamTradeStats } from "@/lib/trades/scored";

export const metadata: Metadata = {
  title: "Games — Trade Score",
  description: "Every NBA game of the day: the final score, then each team's Trade Score. Did the better trader win?",
};

export default function GamesPage(props: PageProps<"/games">) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="display text-sm font-bold text-accent">Every night</p>
        <h1 className="display text-4xl font-extrabold leading-[1.02] sm:text-5xl">Games</h1>
        <p className="max-w-xl text-muted">
          The day&apos;s results first, then each team&apos;s Trade Score (the average grade of its trades this season). Did the better trader win?
        </p>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
        <Games searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

const longDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
const shortDay = (yyyymmdd: string) =>
  new Date(`${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

async function Games({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { date } = await searchParams;
  const asked = typeof date === "string" && /^\d{8}$/.test(date) ? date : undefined;
  const [{ day, games }, trades, { teams, players }] = await Promise.all([getScoreboard(asked), getScoredTrades(), getValuedPlayers()]);
  const stats = new Map(teamStats(trades).map((s) => [s.team.abbreviation, s]));
  const rs = rosterScores(players);
  const info: TeamInfo = new Map(teams.map((t) => [t.abbreviation, { slug: t.slug, logo: t.logo_url, roster: rs.get(t.id) ?? 50 }]));

  // Finished games with a favorite (better Trade Score, or better Roster Score): did it win?
  const judged = games.filter((g) => g.state === "post" && edge(g, stats, info));
  const right = judged.filter((g) => edge(g, stats, info)!.team.winner).length;
  const prev = shiftDay(day, -1), next = shiftDay(day, 1);

  return (
    <div className="space-y-6">
      {/* Day picker */}
      <nav aria-label="Pick a day" className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-1.5">
        <Link href={`/games?date=${prev}`} className="display flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-muted hover:bg-surface-2 hover:text-foreground">
          ◂ <span className="ml-1 hidden sm:inline">{shortDay(prev)}</span>
        </Link>
        <span className="text-center">
          <span className="display block text-lg font-extrabold leading-tight sm:text-xl">{longDay(day)}</span>
          <span className="num text-[11px] text-muted">{games.length} game{games.length === 1 ? "" : "s"}</span>
        </span>
        <Link href={`/games?date=${next}`} className="display flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-muted hover:bg-surface-2 hover:text-foreground">
          <span className="mr-1 hidden sm:inline">{shortDay(next)}</span> ▸
        </Link>
      </nav>

      {judged.length > 0 && (
        <Card className="led flex flex-wrap items-center gap-x-4 gap-y-1 p-4">
          <span className="display text-4xl font-extrabold tabular-nums text-accent">
            {right}/{judged.length}
          </span>
          <span className="text-sm text-muted">
            times the team with the <b className="text-foreground">better score</b> won (Trade Score when both teams have traded, Roster Score otherwise).
          </span>
        </Card>
      )}

      {games.length === 0 ? (
        <Card className="p-8 text-center text-muted">No NBA game this day.</Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {games.map((g) => (
            <li key={g.id} className="min-w-0">
              <GameCard game={g} stats={stats} info={info} />
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">Scores: ESPN, refreshed every few minutes. TS = Trade Score, average grade of the team&apos;s 2026-27 trades. RS = Roster Score, how good its contracts are. Both 1-99.</p>
    </div>
  );
}

type TeamInfo = Map<string, { slug: string; logo: string | null; roster: number }>;

// The favorite on paper: better Trade Score when both teams have traded, else better Roster Score (null if tied).
function edge(g: Game, stats: Map<string, TeamTradeStats>, info: TeamInfo): { team: GameTeam; metric: "TS" | "RS" } | null {
  const ta = stats.get(g.away.abbreviation)?.average, th = stats.get(g.home.abbreviation)?.average;
  if (ta !== undefined && th !== undefined && ta !== th) return { team: ta > th ? g.away : g.home, metric: "TS" };
  const ra = info.get(g.away.abbreviation)?.roster, rh = info.get(g.home.abbreviation)?.roster;
  if (ra !== undefined && rh !== undefined && ra !== rh) return { team: ra > rh ? g.away : g.home, metric: "RS" };
  return null;
}

function GameCard({ game, stats, info }: { game: Game; stats: Map<string, TeamTradeStats>; info: TeamInfo }) {
  const fav = edge(game, stats, info);
  const time =
    game.state === "pre"
      ? new Date(game.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET"
      : game.detail;

  let verdict: React.ReactNode = <span className="text-muted">Same score on paper: no favorite.</span>;
  if (fav) {
    const name = fav.team.name.split(" ").slice(-1)[0];
    const what = fav.metric === "TS" ? "better trader" : "better roster";
    verdict =
      game.state !== "post" ? (
        <span>Favorite on paper ({what}): <b className="text-foreground">{name}</b></span>
      ) : fav.team.winner ? (
        <span className="text-score-5">✓ The {what} won: <b>{name}</b></span>
      ) : (
        <span className="text-score-2">✗ Upset: the {what} ({name}) lost</span>
      );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-2 text-xs">
        <span className={`display font-bold ${game.state === "in" ? "text-accent" : "text-muted"}`}>
          {game.state === "in" && <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent align-middle" aria-hidden />}
          {time}
        </span>
        <span className="display text-[10px] font-bold text-muted">
          <span className="inline-block w-14 text-right">Score</span>
          <span className="inline-block w-9 text-center" title="Trade Score: average grade of the team's trades">TS</span>
          <span className="inline-block w-9 text-center" title="Roster Score: how good the team's contracts are">RS</span>
        </span>
      </div>
      <div className="divide-y divide-border/60">
        {[game.away, game.home].map((t) => (
          <TeamLine
            key={t.abbreviation}
            team={t}
            game={game}
            stat={stats.get(t.abbreviation)}
            roster={info.get(t.abbreviation)?.roster ?? 50}
            slug={info.get(t.abbreviation)?.slug}
            logoUrl={info.get(t.abbreviation)?.logo ?? null}
            ring={fav?.team.abbreviation === t.abbreviation ? fav.metric : null}
          />
        ))}
      </div>
      <p className="border-t border-border px-4 py-2 text-xs">{verdict}</p>
    </Card>
  );
}

function TeamLine({
  team,
  game,
  stat,
  roster,
  slug,
  logoUrl,
  ring,
}: {
  team: GameTeam;
  game: Game;
  stat?: TeamTradeStats;
  roster: number;
  slug?: string;
  logoUrl: string | null;
  ring: "TS" | "RS" | null; // which score makes this team the favorite
}) {
  const ringed = (on: boolean) => `rounded ${on ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`;
  const lost = game.state === "post" && !team.winner;
  const logo = logoUrl ? <Image src={logoUrl} alt="" width={32} height={32} className="h-8 w-8 shrink-0 object-contain" /> : <TeamMark abbreviation={team.abbreviation} />;
  const name = (
    <span className="min-w-0 flex-1">
      <span className={`display block truncate text-lg font-extrabold leading-tight ${lost ? "text-muted" : ""}`}>{team.name.split(" ").slice(-1)[0]}</span>
      {team.record && <span className="num text-[11px] text-muted">{team.record}</span>}
    </span>
  );
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
      {slug ? (
        <Link href={`/team/${slug}`} className="flex min-w-0 flex-1 items-center gap-3 hover:text-accent">
          {logo}
          {name}
        </Link>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-3">{logo}{name}</span>
      )}
      <span className={`display w-14 text-right text-3xl font-extrabold tabular-nums ${lost ? "text-muted" : "text-foreground"}`}>
        {team.score ?? "–"}
        {team.winner && <span className="ml-0.5 align-middle text-sm text-accent" aria-label="winner">◂</span>}
      </span>
      <span className="flex w-9 justify-center">
        {stat ? (
          <span className={ringed(ring === "TS")} title={`Trade Score · ${stat.trades} trade(s) this season`}>
            <ScoreBadge score={stat.average} />
          </span>
        ) : (
          <span className="text-xs text-muted" title="No trade yet">–</span>
        )}
      </span>
      <span className="flex w-9 justify-center">
        <span className={ringed(ring === "RS")} title="Roster Score">
          <ScoreBadge score={roster} />
        </span>
      </span>
    </div>
  );
}
