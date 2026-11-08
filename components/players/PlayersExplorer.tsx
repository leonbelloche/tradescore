"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ScoreBadge from "@/components/ScoreBadge";
import { Card, TeamMark } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import type { ValuedPlayer } from "@/lib/players/values";
import PlayerAvatar from "./PlayerAvatar";

type Sort = "value" | "salary" | "gmsc" | "age";
const SORTS: { id: Sort; label: string }[] = [
  { id: "value", label: "Trade Value" },
  { id: "salary", label: "Salary" },
  { id: "gmsc", label: "Game Score" },
  { id: "age", label: "Youngest" },
];
const POSITIONS = ["All", "G", "F", "C"];
const PAGE = 50;

// Searchable, filterable table of every player and his Trade Value /100.
export default function PlayersExplorer({ players, teams }: { players: ValuedPlayer[]; teams: { abbreviation: string; name: string }[] }) {
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("All");
  const [pos, setPos] = useState("All");
  const [sort, setSort] = useState<Sort>("value");
  const [shown, setShown] = useState(PAGE);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = players.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q)) &&
        (team === "All" || p.team.abbreviation === team) &&
        (pos === "All" || p.position.includes(pos)),
    );
    const by: Record<Sort, (a: ValuedPlayer, b: ValuedPlayer) => number> = {
      value: (a, b) => b.value - a.value,
      salary: (a, b) => b.salary - a.salary,
      gmsc: (a, b) => b.gameScore - a.gameScore,
      age: (a, b) => a.age - b.age,
    };
    return [...list].sort(by[sort]);
  }, [players, query, team, pos, sort]);

  const select = "min-h-11 rounded-lg border border-border bg-surface px-3 text-sm";
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }}
          placeholder="Search a player…"
          aria-label="Search a player"
          className={`${select} w-full placeholder:text-muted`}
        />
        <select aria-label="Team" value={team} onChange={(e) => { setTeam(e.target.value); setShown(PAGE); }} className={select}>
          <option value="All">All teams</option>
          {teams.map((t) => (
            <option key={t.abbreviation} value={t.abbreviation}>{t.name}</option>
          ))}
        </select>
        <div className="flex gap-1" role="group" aria-label="Position">
          {POSITIONS.map((p) => (
            <button
              key={p}
              onClick={() => { setPos(p); setShown(PAGE); }}
              aria-pressed={pos === p}
              className={`display min-h-11 min-w-11 flex-1 rounded-lg border px-3 text-sm font-bold ${pos === p ? "border-accent bg-accent text-black" : "border-border bg-surface text-muted hover:text-foreground"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="display font-bold text-muted">Sort</span>
        {SORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSort(s.id)}
            aria-pressed={sort === s.id}
            className={`display min-h-9 rounded-full border px-3 text-xs font-bold ${sort === s.id ? "border-accent text-accent" : "border-border text-muted hover:text-foreground"}`}
          >
            {s.label}
          </button>
        ))}
        <span className="num ml-auto text-xs text-muted">{rows.length} players</span>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[20rem] text-sm">
          <thead className="display border-b border-border text-left text-[11px] font-bold text-muted">
            <tr>
              <th className="w-10 px-3 py-3">#</th>
              <th className="px-2 py-3">Player</th>
              <th className="hidden px-2 py-3 text-right sm:table-cell">Age</th>
              <th className="hidden px-2 py-3 text-right md:table-cell" title="Average Game Score (Hollinger)">GmSc</th>
              <th className="hidden px-2 py-3 text-right sm:table-cell">Salary</th>
              <th className="px-3 py-3 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, shown).map((p, i) => (
              <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-surface-2">
                <td className={`num px-3 py-2.5 ${i < 3 && sort === "value" ? "text-accent" : "text-muted"}`}>{i + 1}</td>
                <td className="px-2 py-2.5">
                  <Link href={`/player/${p.slug}`} className="flex min-h-10 items-center gap-2.5">
                    <PlayerAvatar name={p.name} url={p.headshotUrl} />
                    <span className="min-w-0">
                      <span className="display block truncate font-bold leading-tight hover:text-accent">{p.name}</span>
                      <span className="flex items-center gap-1.5 text-[11px] text-muted">
                        <TeamMark abbreviation={p.team.abbreviation} logoUrl={p.team.logo_url} />
                        <span className="num">{p.position}</span>
                        <span className="num sm:hidden">· {p.hasContract ? formatMoney(p.salary) : "no contract"}</span>
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="num hidden px-2 py-2.5 text-right sm:table-cell">{p.age}</td>
                <td className="num hidden px-2 py-2.5 text-right text-muted md:table-cell">{p.gameScore.toFixed(1)}</td>
                <td className="num hidden px-2 py-2.5 text-right sm:table-cell">
                  {p.hasContract ? formatMoney(p.salary) : <span className="text-muted" title="No contract data yet">—</span>}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <ScoreBadge score={p.score} size="md" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-center text-muted">No player matches.</p>}
      </Card>
      {shown < rows.length && (
        <button
          onClick={() => setShown((n) => n + PAGE)}
          className="display min-h-11 w-full rounded-lg border border-border bg-surface text-sm font-bold text-muted hover:text-foreground"
        >
          Show {Math.min(PAGE, rows.length - shown)} more
        </button>
      )}
    </div>
  );
}
