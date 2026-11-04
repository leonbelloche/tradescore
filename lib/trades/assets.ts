// Turns database rows into Trade Score engine assets.
import type { RosterPlayer, TeamWithRoster } from "@/lib/db/teams";
import type { League } from "@/lib/db/types";
import { blendGameScore, salariesAsCapFraction, type PlayerAsset } from "@/lib/score/engine";

// "2026-27" -> "2025-26"
export function previousSeason(season: string): string {
  const start = Number(season.slice(0, 4)) - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

// "2026-27" -> 2027 (this season's draft)
export function draftYearOf(season: string): number {
  return Number(season.slice(0, 4)) + 1;
}

export function toPlayerAsset(p: RosterPlayer, team: TeamWithRoster, league: League): PlayerAsset {
  const current = league.current_season;
  const { gameScore, availability } = blendGameScore(
    p.stats_json[current],
    p.stats_json[previousSeason(current)],
    team.wins + team.losses,
  );
  const remaining = p.contracts.filter((c) => c.season >= current).map((c) => c.salary);
  return {
    kind: "player",
    id: p.id,
    name: p.name,
    age: p.age,
    gameScore,
    availability,
    salaries: salariesAsCapFraction(remaining, league.salary_cap),
  };
}

// Projected slot of each team's pick in this year's draft:
// worst record = earliest pick, scaled to a 30-team league.
export function projectedSlots(teams: { id: string; wins: number; losses: number }[]): Map<string, number> {
  const winPct = (t: { wins: number; losses: number }) => (t.wins + t.losses ? t.wins / (t.wins + t.losses) : 0.5);
  const ranked = [...teams].sort((a, b) => winPct(a) - winPct(b));
  return new Map(ranked.map((t, i) => [t.id, Math.ceil(((i + 1) / ranked.length) * 30)]));
}
