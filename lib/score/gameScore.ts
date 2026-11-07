// Game Score (Hollinger), season blend and availability.
import { SCORE_CONFIG as C } from "./config";

export type SeasonLine = {
  gp: number;
  pts: number; fgm: number; fga: number; ftm: number; fta: number;
  orb: number; drb: number; ast: number; stl: number; blk: number; tov: number; pf: number;
};

// Hollinger Game Score from per-game averages. These weights ARE the published formula, not tuning knobs.
export function gameScore(s: SeasonLine): number {
  return s.pts + 0.4 * s.fgm - 0.7 * s.fga - 0.4 * (s.fta - s.ftm) + 0.7 * s.orb + 0.3 * s.drb
    + s.stl + 0.7 * s.ast + 0.7 * s.blk - 0.4 * s.pf - s.tov;
}

// 60% current season + 40% previous one (100% previous when fewer than 10 games this season).
// Availability (games played / games possible, max 1) is blended with the same weights.
export function blendGameScore(
  current: SeasonLine | undefined,
  previous: SeasonLine | undefined,
  teamGamesThisSeason: number,
): { gameScore: number; availability: number } {
  const avail = (gp: number, possible: number) => (possible > 0 ? Math.min(1, gp / possible) : 1);
  const useCurrent = current && current.gp >= C.minGamesCurrentSeason;

  if (useCurrent && previous) {
    const w = C.currentSeasonWeight;
    return {
      gameScore: w * gameScore(current) + (1 - w) * gameScore(previous),
      availability: w * avail(current.gp, teamGamesThisSeason) + (1 - w) * avail(previous.gp, C.gamesPerSeason),
    };
  }
  if (useCurrent) return { gameScore: gameScore(current), availability: avail(current.gp, teamGamesThisSeason) };
  if (previous) return { gameScore: gameScore(previous), availability: avail(previous.gp, C.gamesPerSeason) };
  return { gameScore: 0, availability: 0 };
}
