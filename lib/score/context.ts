// Team context: contender / middle / rebuild.
import { SCORE_CONFIG as C } from "./config";
import type { TeamMode } from "./types";

// Automatic mode from the current record.
export function modeFromRecord(wins: number, losses: number): TeamMode {
  const games = wins + losses;
  if (games === 0) return "middle";
  const pct = wins / games;
  if (pct >= C.contenderMinWinPct) return "contender";
  if (pct <= C.rebuildMaxWinPct) return "rebuild";
  return "middle";
}

// Context multiplier for season t (0 = this season); past the end of the table, keep the last value.
export function contextAt(mode: TeamMode, t: number): number {
  const row = C.context[mode];
  return row[Math.min(t, row.length - 1)];
}
