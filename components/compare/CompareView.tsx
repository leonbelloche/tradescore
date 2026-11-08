"use client";

import Link from "next/link";
import { useState } from "react";
import PlayerAvatar from "@/components/players/PlayerAvatar";
import ScoreBadge from "@/components/ScoreBadge";
import { Card, TeamMark } from "@/components/ui";
import { formatMoney } from "@/lib/format";

export type CompareTeam = {
  id: string; name: string; slug: string; abbreviation: string; logo_url: string | null;
  wins: number; losses: number; payroll: number;
  trades: number; tradeAverage: number | null; tradeWins: number; tradeLosses: number;
  rosterValue: number; // sum of Trade Values above 50 = surplus talent on the roster
  star: { name: string; score: number } | null;
};
export type ComparePlayer = {
  id: string; name: string; slug: string; headshotUrl: string | null; teamAbbr: string; teamName: string; teamLogo: string | null;
  age: number; position: string; score: number; contender: number; rebuild: number; gameScore: number; salary: number; yearsLeft: number;
};

// A metric row: `better` says which side wins it ("high" = bigger is better).
type Metric<T> = { label: string; get: (x: T) => number | null; show: (x: T) => React.ReactNode; better: "high" | "low" | "none" };

const TEAM_METRICS: Metric<CompareTeam>[] = [
  { label: "Record", get: (t) => (t.wins + t.losses ? t.wins / (t.wins + t.losses) : 0), show: (t) => `${t.wins}-${t.losses}`, better: "high" },
  { label: "Avg Trade Score", get: (t) => t.tradeAverage, show: (t) => (t.tradeAverage === null ? "—" : <ScoreBadge score={t.tradeAverage} />), better: "high" },
  { label: "Trades won-lost", get: (t) => t.tradeWins - t.tradeLosses, show: (t) => `${t.tradeWins}-${t.tradeLosses}`, better: "high" },
  { label: "Trades made", get: (t) => t.trades, show: (t) => t.trades, better: "none" },
  { label: "Roster surplus", get: (t) => t.rosterValue, show: (t) => `+${t.rosterValue}`, better: "high" },
  { label: "Top player value", get: (t) => t.star?.score ?? null, show: (t) => (t.star ? <ScoreBadge score={t.star.score} /> : "—"), better: "high" },
  { label: "Payroll", get: (t) => t.payroll, show: (t) => formatMoney(t.payroll), better: "low" },
];
const PLAYER_METRICS: Metric<ComparePlayer>[] = [
  { label: "Trade Value", get: (p) => p.score, show: (p) => <ScoreBadge score={p.score} />, better: "high" },
  { label: "For a Win-now team", get: (p) => p.contender, show: (p) => <ScoreBadge score={p.contender} />, better: "high" },
  { label: "For a Rebuilding team", get: (p) => p.rebuild, show: (p) => <ScoreBadge score={p.rebuild} />, better: "high" },
  { label: "Game Score", get: (p) => p.gameScore, show: (p) => p.gameScore.toFixed(1), better: "high" },
  { label: "Age", get: (p) => p.age, show: (p) => p.age, better: "low" },
  { label: "Salary", get: (p) => p.salary || null, show: (p) => (p.salary ? formatMoney(p.salary) : "—"), better: "low" },
  { label: "Years left", get: (p) => p.yearsLeft, show: (p) => p.yearsLeft, better: "none" },
];

function winner<T>(m: Metric<T>, a: T, b: T): "a" | "b" | null {
  const x = m.get(a), y = m.get(b);
  if (m.better === "none" || x === null || y === null || x === y) return null;
  return (m.better === "high" ? x > y : x < y) ? "a" : "b";
}

function Table<T>({ metrics, a, b }: { metrics: Metric<T>[]; a: T; b: T }) {
  const wins = { a: 0, b: 0 };
  const rows = metrics.map((m) => {
    const w = winner(m, a, b);
    if (w) wins[w]++;
    const cell = (side: "a" | "b", x: T) => (
      <td className={`num px-3 py-2.5 ${side === "a" ? "text-left" : "text-right"} ${w === side ? "font-bold text-foreground" : "text-muted"}`}>
        <span className="inline-flex items-center gap-1.5">
          {w === side && side === "b" && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-label="better" />}
          {m.show(x)}
          {w === side && side === "a" && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-label="better" />}
        </span>
      </td>
    );
    return (
      <tr key={m.label} className="border-b border-border/60 last:border-0">
        {cell("a", a)}
        <th className="display px-2 py-2.5 text-center text-[11px] font-bold text-muted">{m.label}</th>
        {cell("b", b)}
      </tr>
    );
  });
  return (
    <Card className="overflow-hidden">
      <div className="led flex items-center justify-center gap-6 border-b border-border bg-surface-2 py-3">
        <span className={`display text-4xl font-extrabold tabular-nums ${wins.a > wins.b ? "text-accent" : ""}`}>{wins.a}</span>
        <span className="display text-xs font-bold text-muted">categories won</span>
        <span className={`display text-4xl font-extrabold tabular-nums ${wins.b > wins.a ? "text-accent" : ""}`}>{wins.b}</span>
      </div>
      <table className="w-full text-sm">
        <tbody>{rows}</tbody>
      </table>
    </Card>
  );
}

const select = "min-h-11 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-sm";

// Head-to-head: two teams or two players side by side, the better value of each row marked in amber.
export default function CompareView({ teams, players }: { teams: CompareTeam[]; players: ComparePlayer[] }) {
  const [tab, setTab] = useState<"teams" | "players">("teams");
  const [ta, setTa] = useState(teams[0]?.id);
  const [tb, setTb] = useState(teams[1]?.id);
  const [pa, setPa] = useState(players[0]?.id);
  const [pb, setPb] = useState(players[1]?.id);
  const teamA = teams.find((t) => t.id === ta)!, teamB = teams.find((t) => t.id === tb)!;
  const playerA = players.find((p) => p.id === pa)!, playerB = players.find((p) => p.id === pb)!;
  const byTeam = [...new Set(players.map((p) => p.teamName))].sort();

  const playerSelect = (value: string, set: (v: string) => void, label: string) => (
    <select aria-label={label} value={value} onChange={(e) => set(e.target.value)} className={select}>
      {byTeam.map((team) => (
        <optgroup key={team} label={team}>
          {players.filter((p) => p.teamName === team).map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.score})</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
  const teamSelect = (value: string, set: (v: string) => void, label: string) => (
    <select aria-label={label} value={value} onChange={(e) => set(e.target.value)} className={select}>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </select>
  );

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Compare" className="inline-flex rounded-xl border border-border bg-surface p-1">
        {(["teams", "players"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`display min-h-11 rounded-lg px-4 text-sm font-bold capitalize transition ${tab === t ? "bg-accent text-black" : "text-muted hover:text-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "teams" ? (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
            <Side href={`/team/${teamA.slug}`} title={teamA.name} mark={<TeamMark abbreviation={teamA.abbreviation} logoUrl={teamA.logo_url} size="lg" />} picker={teamSelect(ta, setTa, "First team")} />
            <span className="display text-xl font-extrabold text-accent">VS</span>
            <Side href={`/team/${teamB.slug}`} title={teamB.name} mark={<TeamMark abbreviation={teamB.abbreviation} logoUrl={teamB.logo_url} size="lg" />} picker={teamSelect(tb, setTb, "Second team")} />
          </div>
          <Table metrics={TEAM_METRICS} a={teamA} b={teamB} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
            <Side href={`/player/${playerA.slug}`} title={playerA.name} sub={`${playerA.teamAbbr} · ${playerA.position}`} mark={<PlayerAvatar name={playerA.name} url={playerA.headshotUrl} size="md" />} picker={playerSelect(pa, setPa, "First player")} />
            <span className="display text-xl font-extrabold text-accent">VS</span>
            <Side href={`/player/${playerB.slug}`} title={playerB.name} sub={`${playerB.teamAbbr} · ${playerB.position}`} mark={<PlayerAvatar name={playerB.name} url={playerB.headshotUrl} size="md" />} picker={playerSelect(pb, setPb, "Second player")} />
          </div>
          <Table metrics={PLAYER_METRICS} a={playerA} b={playerB} />
        </>
      )}
    </div>
  );
}

function Side({ href, title, sub, mark, picker }: { href: string; title: string; sub?: string; mark: React.ReactNode; picker: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-2">
      <Link href={href} className="flex min-w-0 flex-col items-center gap-1 text-center hover:text-accent">
        {mark}
        <span className="display w-full truncate text-base font-extrabold leading-tight sm:text-xl">{title}</span>
        {sub && <span className="num text-[11px] text-muted">{sub}</span>}
      </Link>
      {picker}
    </div>
  );
}
