"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";
import { getLeagueRules } from "@/lib/leagues";
import type { TeamCheck, TradeMove } from "@/lib/leagues/types";

export type BuilderPlayer = {
  id: string;
  name: string;
  position: string;
  age: number;
  salary: number;
  yearsLeft: number;
};

export type BuilderTeam = {
  id: string;
  name: string;
  abbreviation: string;
  payroll: number;
  players: BuilderPlayer[];
};

type Props = {
  leagueId: string;
  salaryCap: number;
  rules: Record<string, unknown>;
  teams: BuilderTeam[];
};

export default function TradeBuilder({ leagueId, salaryCap, rules, teams }: Props) {
  const leagueRules = getLeagueRules(leagueId);

  // Team picked in each slot ("" = not picked yet).
  const [slots, setSlots] = useState<string[]>(["", ""]);
  // playerId -> id of the team receiving him.
  const [moves, setMoves] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const playerById = useMemo(
    () => new Map(teams.flatMap((t) => t.players.map((p) => [p.id, { ...p, teamId: t.id }] as const))),
    [teams],
  );

  const selected = slots.filter(Boolean).map((id) => teamById.get(id)!);

  const tradeMoves: TradeMove[] = Object.entries(moves).map(([playerId, to]) => {
    const player = playerById.get(playerId)!;
    return { playerId, from: player.teamId, to, salary: player.salary };
  });

  const validation =
    selected.length >= 2
      ? leagueRules.validateTrade({
          salaryCap,
          rules,
          teams: selected.map((t) => ({ id: t.id, abbreviation: t.abbreviation, payroll: t.payroll })),
          moves: tradeMoves,
        })
      : null;

  // Keep only moves whose both teams are still in the trade.
  function pruneMoves(nextSlots: string[]) {
    const inTrade = new Set(nextSlots.filter(Boolean));
    setMoves((prev) =>
      Object.fromEntries(
        Object.entries(prev).filter(([pid, to]) => inTrade.has(to) && inTrade.has(playerById.get(pid)!.teamId)),
      ),
    );
  }

  function pickTeam(slot: number, teamId: string) {
    const next = slots.map((id, i) => (i === slot ? teamId : id));
    setSlots(next);
    pruneMoves(next);
    setNotice("");
  }

  function removeSlot(slot: number) {
    const next = slots.filter((_, i) => i !== slot);
    setSlots(next);
    pruneMoves(next);
    setNotice("");
  }

  function togglePlayer(playerId: string, fromTeamId: string) {
    setNotice("");
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
    setNotice("");
  }

  const checkFor = (teamId: string) => validation?.teams.find((t) => t.teamId === teamId);
  const hasMoves = tradeMoves.length > 0;

  return (
    <div className="space-y-6 pb-28">
      {/* 1. Team pickers */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase text-muted">Teams</h2>
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

      {selected.length < 2 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
          Choose at least 2 teams to start.
        </p>
      ) : (
        /* 2. One card per team: roster to pick from + live salary check */
        <section className={`grid gap-4 ${selected.length === 3 ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
          {selected.map((team) => {
            const others = selected.filter((t) => t.id !== team.id);
            const incoming = tradeMoves.filter((m) => m.to === team.id).map((m) => playerById.get(m.playerId)!);
            return (
              <div key={team.id} className="overflow-hidden rounded-xl border border-border bg-surface">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <p className="text-xs font-black text-accent">{team.abbreviation}</p>
                    <p className="font-bold">{team.name}</p>
                  </div>
                  <p className="text-right text-xs text-muted">
                    Payroll
                    <span className="block text-sm font-bold tabular-nums text-foreground">
                      {formatMoney(team.payroll)}
                    </span>
                  </p>
                </div>

                <p className="px-4 pt-3 text-[11px] uppercase text-muted">Tap to send</p>
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
                            <span className="block truncate font-semibold">{p.name}</span>
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

                {incoming.length > 0 && (
                  <div className="border-t border-border px-4 py-3 text-sm">
                    <p className="text-[11px] uppercase text-muted">Receives</p>
                    {incoming.map((p) => (
                      <p key={p.id} className="flex justify-between">
                        <span>
                          {p.name} <span className="text-xs text-muted">from {teamById.get(p.teamId)!.abbreviation}</span>
                        </span>
                        <span className="tabular-nums">{formatMoney(p.salary)}</span>
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
            {notice ? (
              <span className="text-accent">{notice}</span>
            ) : !validation || !hasMoves ? (
              <span className="text-muted">No players moved yet.</span>
            ) : validation.valid ? (
              <span className="font-semibold text-emerald-400">✓ Valid trade</span>
            ) : (
              <span className="font-semibold text-red-400">
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
            onClick={() => setNotice("Trade Score is coming soon.")}
            className="rounded-full bg-accent px-6 py-3 font-bold text-black transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Analyze
          </button>
        </div>
      </div>

      {/* Full list of problems, so the user knows exactly what to fix */}
      {validation && hasMoves && !validation.valid && (
        <section className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm" role="alert">
          <p className="mb-2 font-bold text-red-300">Why this trade is not allowed</p>
          <ul className="list-disc space-y-1 pl-5 text-red-200">
            {validation.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SalaryCheck({ check, salaryCap, active }: { check?: TeamCheck; salaryCap: number; active: boolean }) {
  if (!check || !active) return null;
  return (
    <div className={`border-t px-4 py-3 text-sm ${check.ok ? "border-border" : "border-red-500/40 bg-red-500/10"}`}>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Figure label="Sends" value={formatMoney(check.outgoing)} />
        <Figure label="Receives" value={formatMoney(check.incoming)} />
        <Figure
          label="Payroll after"
          value={formatMoney(check.payrollAfter)}
          tone={check.payrollAfter > salaryCap ? "text-red-400" : "text-emerald-400"}
        />
      </div>
      <p className={`mt-2 text-xs ${check.ok ? "text-emerald-400" : "text-red-300"}`}>
        {check.ok ? "✓ " : "✕ "}
        {check.message}
      </p>
    </div>
  );
}

function Figure({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted">{label}</p>
      <p className={`font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}
