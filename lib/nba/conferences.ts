// NBA conferences, by ESPN team abbreviation.
const EAST = new Set(["ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DET", "IND", "MIA", "MIL", "NY", "ORL", "PHI", "TOR", "WSH"]);

export type Conference = "East" | "West";

export function conferenceOf(abbreviation: string): Conference {
  return EAST.has(abbreviation) ? "East" : "West";
}

export type StandingRow<T> = T & { wins: number; losses: number; pct: number; gamesBehind: number };

// Sorts by win% (then wins) and adds games behind the leader.
export function standings<T extends { wins: number; losses: number }>(teams: T[]): StandingRow<T>[] {
  const withPct = teams.map((t) => ({ ...t, pct: t.wins + t.losses ? t.wins / (t.wins + t.losses) : 0 }));
  withPct.sort((a, b) => b.pct - a.pct || b.wins - a.wins);
  const leader = withPct[0];
  return withPct.map((t) => ({ ...t, gamesBehind: leader ? (leader.wins - t.wins + (t.losses - leader.losses)) / 2 : 0 }));
}
