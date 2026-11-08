"use client";

import { useMemo, useRef, useState } from "react";
import { MODE_INFO } from "@/components/ModeBadge";
import ScoreBadge from "@/components/ScoreBadge";
import ResultCard, { TradeErrors } from "@/components/trades/ResultCard";
import { Button, TeamMark } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import {
  modeFromRecord,
  rulesFor,
  scoreTrade,
  validateTrade,
  type SalaryCheck as SalaryCheckResult,
  type TeamMode,
  type Trade,
  type TradeLeg,
} from "@/lib/score";

export type BuilderPlayer = {
  id: string;
  name: string;
  position: string;
  age: number;
  salary: number;
  yearsLeft: number;
  gameScore: number;
  availability: number;
  salaryCapFractions: number[];
};

export type BuilderTeam = {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  logoUrl: string | null;
  wins: number;
  losses: number;
  payroll: number;
  players: BuilderPlayer[];
};

// A draft pick added in the simulator.
type PickDraft = {
  id: string;
  from: string; // team giving the pick (also the team whose record sets the slot)
  to: string;
  round: 1 | 2;
  year: number; // draft year, e.g. 2027
  protected: boolean;
};

const MODE_LABEL: Record<TeamMode, string> = { contender: MODE_INFO.contender.label, middle: MODE_INFO.middle.label, rebuild: MODE_INFO.rebuild.label };

type Props = {
  currentSeason: string; // e.g. "2026-27"
  salaryCap: number;
  rules: Record<string, unknown>;
  teams: BuilderTeam[];
};

export default function TradeBuilder({ currentSeason, salaryCap, rules, teams }: Props) {
  const leagueRules = rulesFor("NBA");

  // Team picked in each slot ("" = not picked yet).
  const [slots, setSlots] = useState<string[]>([]);
  // playerId -> id of the team receiving him.
  const [moves, setMoves] = useState<Record<string, string>>({});
  // Team mode chosen by the user; otherwise it comes from the win-loss record.
  const [modeOverrides, setModeOverrides] = useState<Record<string, TeamMode>>({});
  const [picks, setPicks] = useState<PickDraft[]>([]);
  const nextPickId = useRef(1);
  // Player search box text, per team.
  const [queries, setQueries] = useState<Record<string, string>>({});

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const playerById = useMemo(
    () => new Map(teams.flatMap((t) => t.players.map((p) => [p.id, { ...p, teamId: t.id }] as const))),
    [teams],
  );

  // This season's draft (2026-27 season -> 2027 draft).
  const thisDraft = Number(currentSeason.slice(0, 4)) + 1;
  // Projected slot of a team's pick in this year's draft: worst record = earliest pick, on a 30-team scale.
  const projectedSlot = useMemo(() => {
    const winPct = (t: BuilderTeam) => (t.wins + t.losses ? t.wins / (t.wins + t.losses) : 0.5);
    const ranked = [...teams].sort((a, b) => winPct(a) - winPct(b));
    return new Map(ranked.map((t, i) => [t.id, Math.ceil(((i + 1) / ranked.length) * 30)]));
  }, [teams]);

  const selected = slots.filter(Boolean).map((id) => teamById.get(id)!);
  const modeOf = (team: BuilderTeam) => modeOverrides[team.id] ?? modeFromRecord(team.wins, team.losses);

  const pickLabel = (p: PickDraft) =>
    `${p.year} ${p.round === 1 ? "1st" : "2nd"}${p.protected ? " (prot.)" : ""} · ${teamById.get(p.from)!.abbreviation}`;

  // Players moved, as { playerId, from, to }.
  const playerMoves = Object.entries(moves).map(([playerId, to]) => ({ playerId, from: playerById.get(playerId)!.teamId, to }));

  // The trade as the Trade Score engine expects it (lib/score/types.ts).
  const trade: Trade | null =
    selected.length >= 2
      ? {
          league: "NBA",
          salaryCap,
          rules,
          teams: selected.map((t) => ({ id: t.id, abbreviation: t.abbreviation, mode: modeOf(t), payroll: t.payroll })),
          legs: [
            ...playerMoves.map((m): TradeLeg => {
              const p = playerById.get(m.playerId)!;
              return {
                fromTeamId: m.from,
                toTeamId: m.to,
                asset: { kind: "player", id: p.id, name: p.name, age: p.age, gameScore: p.gameScore, availability: p.availability, salaries: p.salaryCapFractions },
              };
            }),
            ...picks.map((p): TradeLeg => ({
              fromTeamId: p.from,
              toTeamId: p.to,
              asset: {
                kind: "pick",
                id: p.id,
                name: pickLabel(p),
                round: p.round,
                yearsUntilDraft: p.year - thisDraft,
                projectedSlot: projectedSlot.get(p.from),
                protected: p.protected,
              },
            })),
          ],
        }
      : null;

  const validation = trade ? validateTrade(trade) : null;

  // Keep only moves and picks whose both teams are still in the trade.
  function pruneMoves(nextSlots: string[]) {
    const inTrade = new Set(nextSlots.filter(Boolean));
    setMoves((prev) =>
      Object.fromEntries(
        Object.entries(prev).filter(([pid, to]) => inTrade.has(to) && inTrade.has(playerById.get(pid)!.teamId)),
      ),
    );
    setPicks((prev) => prev.filter((p) => inTrade.has(p.from) && inTrade.has(p.to)));
  }

  function addPick(fromTeamId: string) {
    const to = selected.find((t) => t.id !== fromTeamId);
    if (!to) return;
    const id = `pick-${nextPickId.current++}`;
    setPicks((prev) => [...prev, { id, from: fromTeamId, to: to.id, round: 1, year: thisDraft + 1, protected: false }]);
  }

  function updatePick(id: string, patch: Partial<PickDraft>) {
    setPicks((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removePick(id: string) {
    setPicks((prev) => prev.filter((p) => p.id !== id));
  }

  function addTeam(teamId: string) {
    if (slots.length >= leagueRules.maxTeams || slots.includes(teamId)) return;
    setSlots([...slots, teamId]);
  }

  function removeTeam(teamId: string) {
    const next = slots.filter((id) => id !== teamId);
    setSlots(next);
    pruneMoves(next);
  }

  function setMode(teamId: string, mode: TeamMode) {
    setModeOverrides((prev) => ({ ...prev, [teamId]: mode }));
  }

  function togglePlayer(playerId: string, fromTeamId: string) {
    setMoves((prev) => {
      const next = { ...prev };
      if (next[playerId]) {
        delete next[playerId];
      } else {
        const firstOther = selected.find((t) => t.id !== fromTeamId);
        if (firstOther) next[playerId] = firstOther.id;
      }
      return next;
    });
  }

  function setDestination(playerId: string, toTeamId: string) {
    setMoves((prev) => ({ ...prev, [playerId]: toTeamId }));
  }

  function reset() {
    setMoves({});
    setPicks([]);
  }

  const checkFor = (teamId: string) => validation?.checks.find((c) => c.teamId === teamId);
  const hasMoves = playerMoves.length + picks.length > 0;
  const errors = validation && !validation.valid ? validation.errors : [];
  // Live Trade Score: recomputed on every change, only for a valid trade with at least one asset.
  const result = trade && hasMoves && validation?.valid ? scoreTrade(trade) : null;

  return (
    <div className="space-y-6 pb-32">
      {/* 1. Team picker: tap logos (2 or 3 teams) */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="display text-xl font-bold leading-none">
            <span className="num mr-2 text-sm text-accent">01</span>Pick your teams
          </h2>
          <span className="num text-xs text-muted">
            {selected.length}/{leagueRules.maxTeams}
          </span>
        </div>
        {selected.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {selected.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => removeTeam(t.id)}
                  aria-label={`Remove ${t.name}`}
                  className="display flex min-h-11 items-center gap-2 rounded-full border border-accent bg-accent/10 py-1 pl-1.5 pr-3 font-bold"
                >
                  <TeamMark abbreviation={t.abbreviation} logoUrl={t.logoUrl} />
                  {t.shortName}
                  <span className="text-muted" aria-hidden>
                    ✕
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {selected.length < leagueRules.maxTeams && (
          <ul className="grid grid-cols-5 gap-1.5 sm:grid-cols-10" aria-label="All teams">
            {teams
              .filter((t) => !slots.includes(t.id))
              .map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => addTeam(t.id)}
                    title={t.name}
                    aria-label={`Add ${t.name}`}
                    className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-lg border border-border bg-surface py-1.5 transition hover:border-accent"
                  >
                    <TeamMark abbreviation={t.abbreviation} logoUrl={t.logoUrl} />
                    <span className="display text-[11px] font-bold text-muted">{t.abbreviation}</span>
                  </button>
                </li>
              ))}
          </ul>
        )}
      </section>

      {selected.length < 2 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
          Tap at least 2 teams to start building.
        </p>
      ) : (
        /* 2. One card per team: searchable roster, picks, live salary check */
        <section className="space-y-3">
          <h2 className="display text-xl font-bold leading-none">
            <span className="num mr-2 text-sm text-accent">02</span>Tap the players to move
          </h2>
          <div className={`grid grid-cols-1 gap-4 ${selected.length === 3 ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
            {selected.map((team) => {
              const others = selected.filter((t) => t.id !== team.id);
              const incoming = playerMoves.filter((m) => m.to === team.id).map((m) => playerById.get(m.playerId)!);
              const query = (queries[team.id] ?? "").trim().toLowerCase();
              const roster = query ? team.players.filter((p) => p.name.toLowerCase().includes(query)) : team.players;
              return (
                <div key={team.id} className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface">
                  <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                    <TeamMark abbreviation={team.abbreviation} logoUrl={team.logoUrl} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="display truncate text-lg font-bold leading-tight">{team.name}</p>
                      <p className="num text-xs text-muted">
                        {team.wins}-{team.losses} · payroll {formatMoney(team.payroll)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border-b border-border px-4 py-2">
                    <input
                      type="search"
                      value={queries[team.id] ?? ""}
                      onChange={(e) => setQueries((q) => ({ ...q, [team.id]: e.target.value }))}
                      placeholder="Search a player…"
                      aria-label={`Search ${team.name} players`}
                      className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted/60"
                    />
                    <select
                      value={modeOf(team)}
                      onChange={(e) => setMode(team.id, e.target.value as TeamMode)}
                      aria-label={`${team.name} team mode`}
                      className="min-h-11 rounded-lg border border-border bg-background px-2 text-xs"
                    >
                      {(Object.keys(MODE_LABEL) as TeamMode[]).map((m) => (
                        <option key={m} value={m}>
                          {MODE_LABEL[m]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <ul className="max-h-[26rem] divide-y divide-border overflow-y-auto">
                    {roster.length === 0 && <li className="px-4 py-3 text-sm text-muted">No player matches “{queries[team.id]}”.</li>}
                    {roster.map((p) => {
                      const to = moves[p.id];
                      return (
                        <li key={p.id}>
                          <div
                            role="button"
                            tabIndex={0}
                            aria-pressed={!!to}
                            onClick={() => togglePlayer(p.id, team.id)}
                            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && togglePlayer(p.id, team.id)}
                            className={`flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2 text-sm transition ${to ? "bg-accent/15" : "hover:bg-surface-2"}`}
                          >
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${to ? "border-accent bg-accent text-black" : "border-border-strong"}`}>
                              {to ? "✓" : ""}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="display block truncate text-sm font-bold">{p.name}</span>
                              <span className="num text-[11px] text-muted">
                                {p.position} · {p.age}y · {p.yearsLeft ? `${p.yearsLeft} yr${p.yearsLeft > 1 ? "s" : ""}` : "no contract data"}
                              </span>
                            </span>
                            {to && others.length > 1 ? (
                              <select
                                value={to}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setDestination(p.id, e.target.value)}
                                aria-label={`Send ${p.name} to`}
                                className="min-h-9 rounded border border-accent bg-background px-1 text-xs"
                              >
                                {others.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    → {o.abbreviation}
                                  </option>
                                ))}
                              </select>
                            ) : to ? (
                              <span className="display text-sm font-bold text-accent">→ {teamById.get(to)!.abbreviation}</span>
                            ) : null}
                            <span className="num w-16 text-right text-xs">{p.salary ? formatMoney(p.salary) : "—"}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Draft picks this team sends */}
                  <div className="space-y-2 border-t border-border px-4 py-3">
                    <p className="display text-xs font-bold text-muted">Draft picks sent</p>
                    {picks
                      .filter((p) => p.from === team.id)
                      .map((p) => (
                        <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-accent/15 p-2 text-xs">
                          <select value={p.year} onChange={(e) => updatePick(p.id, { year: Number(e.target.value) })} aria-label="Draft year" className="min-h-9 rounded border border-border bg-background px-1">
                            {[0, 1, 2, 3, 4].map((k) => (
                              <option key={k} value={thisDraft + k}>
                                {thisDraft + k}
                                {k === 0 ? " (this draft)" : ""}
                              </option>
                            ))}
                          </select>
                          <select value={p.round} onChange={(e) => updatePick(p.id, { round: Number(e.target.value) as 1 | 2 })} aria-label="Round" className="min-h-9 rounded border border-border bg-background px-1">
                            <option value={1}>1st round</option>
                            <option value={2}>2nd round</option>
                          </select>
                          <label className="flex min-h-9 items-center gap-1">
                            <input type="checkbox" checked={p.protected} onChange={(e) => updatePick(p.id, { protected: e.target.checked })} />
                            Protected
                          </label>
                          {others.length > 1 ? (
                            <select value={p.to} onChange={(e) => updatePick(p.id, { to: e.target.value })} aria-label="Send pick to" className="min-h-9 rounded border border-accent bg-background px-1">
                              {others.map((o) => (
                                <option key={o.id} value={o.id}>
                                  → {o.abbreviation}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="display font-bold text-accent">→ {teamById.get(p.to)!.abbreviation}</span>
                          )}
                          <button onClick={() => removePick(p.id)} aria-label="Remove pick" className="ml-auto min-h-9 min-w-9 text-muted hover:text-foreground">
                            ✕
                          </button>
                        </div>
                      ))}
                    <button onClick={() => addPick(team.id)} className="display min-h-11 w-full rounded-lg border border-dashed border-border-strong text-sm font-bold text-muted hover:border-accent hover:text-foreground">
                      + Add a pick
                    </button>
                  </div>

                  {(incoming.length > 0 || picks.some((p) => p.to === team.id)) && (
                    <div className="border-t border-border px-4 py-3 text-sm">
                      <p className="display text-xs font-bold text-muted">Receives</p>
                      {incoming.map((p) => (
                        <p key={p.id} className="flex justify-between gap-2">
                          <span className="truncate">
                            {p.name} <span className="text-xs text-muted">from {teamById.get(p.teamId)!.abbreviation}</span>
                          </span>
                          <span className="num text-xs">{p.salary ? formatMoney(p.salary) : "—"}</span>
                        </p>
                      ))}
                      {picks
                        .filter((p) => p.to === team.id)
                        .map((p) => (
                          <p key={p.id} className="flex justify-between">
                            <span>{pickLabel(p)}</span>
                            <span className="text-xs text-muted">pick</span>
                          </p>
                        ))}
                    </div>
                  )}

                  <SalaryCheck check={checkFor(team.id)} salaryCap={salaryCap} active={hasMoves} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Problems, written out, so the user knows exactly what to fix */}
      {hasMoves && errors.length > 0 && <TradeErrors errors={errors} />}

      {/* 3. Live Trade Score: recomputed on every change */}
      {result && result.valid && (
        <section id="result" className="scroll-mt-40 space-y-3">
          <h2 className="display text-xl font-bold leading-none">
            <span className="num mr-2 text-sm text-accent">03</span>
            {result.isEven ? "Even trade" : `${teamById.get(result.winnerTeamId!)!.shortName} win the trade`}
          </h2>
          <div className={`grid grid-cols-1 gap-3 ${result.teams.length === 3 ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
            {[...result.teams]
              .sort((x, y) => y.score - x.score)
              .map((t) => {
                const team = teamById.get(t.teamId)!;
                return (
                  <ResultCard
                    key={t.teamId}
                    team={{ name: team.name, abbreviation: team.abbreviation, logoUrl: team.logoUrl, record: { wins: team.wins, losses: team.losses } }}
                    result={t}
                    showSent
                  />
                );
              })}
          </div>
        </section>
      )}

      {/* Live scoreboard stuck to the bottom of the screen */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border-strong bg-black/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-3 py-2.5 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto">
            {!hasMoves || !validation ? (
              <span className="text-sm text-muted">{selected.length < 2 ? "Pick 2 teams to start." : "Tap players or add picks: the score updates live."}</span>
            ) : !validation.valid ? (
              <span className="display text-sm font-bold text-score-1">
                ✕ Not allowed — {errors.length} problem{errors.length > 1 ? "s" : ""}
              </span>
            ) : (
              result?.valid &&
              result.teams.map((t) => (
                <span key={t.teamId} className="flex shrink-0 items-center gap-1.5">
                  <span className="display text-sm font-bold">{teamById.get(t.teamId)!.abbreviation}</span>
                  <ScoreBadge score={t.score} size="md" />
                </span>
              ))
            )}
          </div>
          {hasMoves && (
            <Button variant="ghost" onClick={reset} className="px-3 text-sm">
              Reset
            </Button>
          )}
          {result?.valid && (
            <Button href="#result" className="px-4 text-sm">
              Details ↓
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SalaryCheck({ check, salaryCap, active }: { check?: SalaryCheckResult; salaryCap: number; active: boolean }) {
  if (!check || !active) return null;
  return (
    <div className={`border-t px-4 py-3 text-sm ${check.ok ? "border-border" : "border-score-1/40 bg-score-1/10"}`}>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Figure label="Sends" value={formatMoney(check.outgoing)} />
        <Figure label="Receives" value={formatMoney(check.incoming)} />
        <Figure
          label="Payroll after"
          value={formatMoney(check.payrollAfter)}
          tone={check.payrollAfter > salaryCap ? "text-score-1" : "text-score-5"}
        />
      </div>
      <p className={`mt-2 text-xs ${check.ok ? "text-score-5" : "text-score-1"}`}>
        {check.ok ? "✓ " : "✕ "}
        {check.message}
      </p>
    </div>
  );
}

function Figure({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="display text-[10px] font-semibold text-muted">{label}</p>
      <p className={`font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}
