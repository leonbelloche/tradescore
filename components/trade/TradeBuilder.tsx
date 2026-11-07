"use client";

import { useMemo, useRef, useState } from "react";
import ScoreBadge, { scoreTone } from "@/components/ScoreBadge";
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
  type TradeResult,
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
  abbreviation: string;
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

const MODE_LABEL: Record<TeamMode, string> = { contender: "Contender", middle: "Middle", rebuild: "Rebuild" };

type Props = {
  currentSeason: string; // e.g. "2026-27"
  salaryCap: number;
  rules: Record<string, unknown>;
  teams: BuilderTeam[];
};

export default function TradeBuilder({ currentSeason, salaryCap, rules, teams }: Props) {
  const leagueRules = rulesFor("NBA");

  // Team picked in each slot ("" = not picked yet).
  const [slots, setSlots] = useState<string[]>(["", ""]);
  // playerId -> id of the team receiving him.
  const [moves, setMoves] = useState<Record<string, string>>({});
  // Team mode chosen by the user; otherwise it comes from the win-loss record.
  const [modeOverrides, setModeOverrides] = useState<Record<string, TeamMode>>({});
  const [picks, setPicks] = useState<PickDraft[]>([]);
  const nextPickId = useRef(1);
  const [result, setResult] = useState<TradeResult | null>(null);
  const resultRef = useRef<HTMLElement>(null);

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
    setResult(null);
  }

  function updatePick(id: string, patch: Partial<PickDraft>) {
    setPicks((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setResult(null);
  }

  function removePick(id: string) {
    setPicks((prev) => prev.filter((p) => p.id !== id));
    setResult(null);
  }

  function pickTeam(slot: number, teamId: string) {
    const next = slots.map((id, i) => (i === slot ? teamId : id));
    setSlots(next);
    pruneMoves(next);
    setResult(null);
  }

  function removeSlot(slot: number) {
    const next = slots.filter((_, i) => i !== slot);
    setSlots(next);
    pruneMoves(next);
    setResult(null);
  }

  function setMode(teamId: string, mode: TeamMode) {
    setModeOverrides((prev) => ({ ...prev, [teamId]: mode }));
    setResult(null);
  }

  function analyze() {
    if (!trade) return;
    setResult(scoreTrade(trade));
    // Let React render the result, then bring it into view.
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function togglePlayer(playerId: string, fromTeamId: string) {
    setResult(null);
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
    setResult(null);
  }

  function reset() {
    setMoves({});
    setPicks([]);
    setResult(null);
  }

  const checkFor = (teamId: string) => validation?.checks.find((c) => c.teamId === teamId);
  const hasMoves = playerMoves.length + picks.length > 0;
  const errors = validation && !validation.valid ? validation.errors : [];

  return (
    <div className="space-y-6 pb-28">
      {/* 1. Team pickers */}
      <section className="space-y-2">
        <h2 className="display text-sm font-bold tracking-[0.06em] text-muted">Teams</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {slots.map((teamId, slot) => (
            <div key={slot} className="flex gap-2">
              <select
                value={teamId}
                onChange={(e) => pickTeam(slot, e.target.value)}
                aria-label={`Team ${slot + 1}`}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"
              >
                <option value="">Choose team {slot + 1}…</option>
                {teams
                  .filter((t) => t.id === teamId || !slots.includes(t.id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
              {slots.length > leagueRules.minTeams && (
                <button
                  onClick={() => removeSlot(slot)}
                  aria-label={`Remove team ${slot + 1}`}
                  className="rounded-lg border border-border px-3 text-muted hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {slots.length < leagueRules.maxTeams && (
            <button
              onClick={() => setSlots([...slots, ""])}
              className="rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted hover:text-foreground"
            >
              + Add a third team
            </button>
          )}
        </div>
      </section>

      {/* Trade Score result (after Analyze) */}
      {result && result.valid && (
        <section ref={resultRef} className="scroll-mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
          {/* Headline */}
          <div className="border-b border-border bg-gradient-to-b from-accent/20 to-transparent px-4 py-6 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Trade Score</p>
            <p className="mt-1 text-3xl font-black uppercase leading-none tracking-tight sm:text-4xl">
              {result.isEven ? (
                "Even trade"
              ) : (
                <>
                  <span className="text-accent">{teamById.get(result.winnerTeamId!)!.name}</span>
                  <br />
                  win the trade
                </>
              )}
            </p>
          </div>

          {/* One row per team, best score first */}
          <ul className="divide-y divide-border">
            {[...result.teams]
              .sort((a, b) => b.score - a.score)
              .map((t) => {
                const team = teamById.get(t.teamId)!;
                const tone = scoreTone(t.score);
                return (
                  <li key={t.teamId} className="space-y-3 px-4 py-4">
                    <div className="flex items-center gap-4">
                      <ScoreBadge score={t.score} size="lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate display text-lg font-bold leading-tight">{team.name}</p>
                        <p className={`text-lg font-black uppercase leading-tight ${tone.text}`}>{t.tier}</p>
                        <p className="text-xs text-muted">{MODE_LABEL[t.mode]}</p>
                      </div>
                    </div>
                    {/* Score bar: 0 on the left, 100 on the right, 50 marked in the middle */}
                    <div className="relative h-2 rounded-full bg-background">
                      <div className={`h-2 rounded-full ${tone.bg}`} style={{ width: `${t.score}%` }} />
                      <div className="absolute inset-y-0 left-1/2 w-px bg-muted/60" />
                    </div>
                    <p className="text-xs text-muted">
                      <span className="font-semibold text-foreground">Gets:</span>{" "}
                      {t.received.length ? t.received.map((a) => a.label).join(", ") : "nothing"}
                    </p>
                  </li>
                );
              })}
          </ul>
        </section>
      )}

      {selected.length < 2 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
          Choose at least 2 teams to start.
        </p>
      ) : (
        /* 2. One card per team: roster to pick from + live salary check */
        <section className={`grid gap-4 ${selected.length === 3 ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
          {selected.map((team) => {
            const others = selected.filter((t) => t.id !== team.id);
            const incoming = playerMoves.filter((m) => m.to === team.id).map((m) => playerById.get(m.playerId)!);
            return (
              <div key={team.id} className="overflow-hidden rounded-xl border border-border bg-surface">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <p className="display text-xs font-bold text-accent">{team.abbreviation}</p>
                    <p className="display text-lg font-bold leading-tight">{team.name}</p>
                  </div>
                  <p className="text-right text-xs text-muted">
                    Payroll
                    <span className="block text-sm font-bold tabular-nums text-foreground">
                      {formatMoney(team.payroll)}
                    </span>
                  </p>
                </div>
                <label className="flex items-center justify-between gap-2 border-b border-border px-4 py-2 text-xs text-muted">
                  <span>
                    {team.wins}-{team.losses} · Team mode
                  </span>
                  <select
                    value={modeOf(team)}
                    onChange={(e) => setMode(team.id, e.target.value as TeamMode)}
                    className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                  >
                    {(Object.keys(MODE_LABEL) as TeamMode[]).map((m) => (
                      <option key={m} value={m}>
                        {MODE_LABEL[m]}
                      </option>
                    ))}
                  </select>
                </label>

                <p className="px-4 pt-3 display text-[11px] font-semibold tracking-[0.06em] text-muted">Tap to send</p>
                <ul className="divide-y divide-border">
                  {team.players.map((p) => {
                    const to = moves[p.id];
                    return (
                      <li key={p.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          aria-pressed={!!to}
                          onClick={() => togglePlayer(p.id, team.id)}
                          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && togglePlayer(p.id, team.id)}
                          className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition ${
                            to ? "bg-accent/15" : "hover:bg-background/50"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                              to ? "border-accent bg-accent text-black" : "border-border"
                            }`}
                          >
                            {to ? "✓" : ""}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="display block truncate text-[15px] font-semibold">{p.name}</span>
                            <span className="text-xs text-muted">
                              {p.position} · {p.age} · {p.yearsLeft} yr{p.yearsLeft > 1 ? "s" : ""}
                            </span>
                          </span>
                          {to && others.length > 1 ? (
                            <select
                              value={to}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setDestination(p.id, e.target.value)}
                              aria-label={`Send ${p.name} to`}
                              className="rounded border border-accent bg-background px-1 py-0.5 text-xs"
                            >
                              {others.map((o) => (
                                <option key={o.id} value={o.id}>
                                  → {o.abbreviation}
                                </option>
                              ))}
                            </select>
                          ) : to ? (
                            <span className="text-xs font-bold text-accent">→ {teamById.get(to)!.abbreviation}</span>
                          ) : null}
                          <span className="w-16 text-right tabular-nums">{formatMoney(p.salary)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Draft picks this team sends */}
                <div className="space-y-2 border-t border-border px-4 py-3">
                  <p className="display text-[11px] font-semibold tracking-[0.06em] text-muted">Draft picks sent</p>
                  {picks
                    .filter((p) => p.from === team.id)
                    .map((p) => (
                      <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-accent/15 p-2 text-xs">
                        <select
                          value={p.year}
                          onChange={(e) => updatePick(p.id, { year: Number(e.target.value) })}
                          aria-label="Draft year"
                          className="rounded border border-border bg-background px-1 py-1"
                        >
                          {[0, 1, 2, 3, 4].map((k) => (
                            <option key={k} value={thisDraft + k}>
                              {thisDraft + k}
                              {k === 0 ? " (this draft)" : ""}
                            </option>
                          ))}
                        </select>
                        <select
                          value={p.round}
                          onChange={(e) => updatePick(p.id, { round: Number(e.target.value) as 1 | 2 })}
                          aria-label="Round"
                          className="rounded border border-border bg-background px-1 py-1"
                        >
                          <option value={1}>1st round</option>
                          <option value={2}>2nd round</option>
                        </select>
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={p.protected}
                            onChange={(e) => updatePick(p.id, { protected: e.target.checked })}
                          />
                          Protected
                        </label>
                        {others.length > 1 ? (
                          <select
                            value={p.to}
                            onChange={(e) => updatePick(p.id, { to: e.target.value })}
                            aria-label="Send pick to"
                            className="rounded border border-accent bg-background px-1 py-1"
                          >
                            {others.map((o) => (
                              <option key={o.id} value={o.id}>
                                → {o.abbreviation}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-bold text-accent">→ {teamById.get(p.to)!.abbreviation}</span>
                        )}
                        <button
                          onClick={() => removePick(p.id)}
                          aria-label="Remove pick"
                          className="ml-auto px-1 text-muted hover:text-foreground"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  <button
                    onClick={() => addPick(team.id)}
                    className="w-full rounded-lg border border-dashed border-border py-2 text-xs text-muted hover:text-foreground"
                  >
                    + Add a pick
                  </button>
                </div>

                {(incoming.length > 0 || picks.some((p) => p.to === team.id)) && (
                  <div className="border-t border-border px-4 py-3 text-sm">
                    <p className="display text-[11px] font-semibold tracking-[0.06em] text-muted">Receives</p>
                    {incoming.map((p) => (
                      <p key={p.id} className="flex justify-between">
                        <span>
                          {p.name} <span className="text-xs text-muted">from {teamById.get(p.teamId)!.abbreviation}</span>
                        </span>
                        <span className="tabular-nums">{formatMoney(p.salary)}</span>
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
        </section>
      )}

      {/* 3. Verdict + Analyze, stuck to the bottom of the screen */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <p className="min-w-0 flex-1 text-sm">
            {!validation || !hasMoves ? (
              <span className="text-muted">No players moved yet.</span>
            ) : validation.valid ? (
              <span className="font-semibold text-score-5">✓ Valid trade</span>
            ) : (
              <span className="font-semibold text-score-1">
                ✕ Trade not allowed — {validation.errors.length} problem{validation.errors.length > 1 ? "s" : ""}
              </span>
            )}
          </p>
          {hasMoves && (
            <button onClick={reset} className="text-sm text-muted hover:text-foreground">
              Reset
            </button>
          )}
          <button
            disabled={!validation?.valid}
            onClick={analyze}
            className="display rounded-lg bg-accent px-6 py-3 text-lg font-bold text-black transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Analyze
          </button>
        </div>
      </div>

      {/* Full list of problems, so the user knows exactly what to fix */}
      {validation && hasMoves && !validation.valid && (
        <section className="rounded-xl border border-score-1/40 bg-score-1/10 p-4 text-sm" role="alert">
          <p className="mb-2 font-bold text-score-1">Why this trade is not allowed</p>
          <ul className="list-disc space-y-1 pl-5 text-foreground">
            {validation.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </section>
      )}
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
