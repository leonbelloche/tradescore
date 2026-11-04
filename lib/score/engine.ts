// Trade Score engine. Pure functions, no database access.
// Every value is a fraction of the salary cap (0.30 = 30% of the cap).
import { SCORE_CONFIG as C, type TeamMode } from "./config";

export type PlayerAsset = {
  kind: "player";
  id: string;
  name: string;
  age: number;
  gameScore: number; // blended Game Score (see blendGameScore)
  availability: number; // games played / games possible, 0..1
  salaries: number[]; // remaining salaries as fractions of that season's cap, from this season
};

export type PickAsset = {
  kind: "pick";
  id: string;
  name: string; // e.g. "2027 1st (MET)"
  round: 1 | 2;
  yearsUntilDraft: number; // 0 = this season's draft
  projectedSlot?: number; // 1-30, only used for this season's 1st round picks
  protected?: boolean;
};

export type Asset = PlayerAsset | PickAsset;

export type TradeInput = {
  teams: { id: string; mode: TeamMode }[];
  moves: { asset: Asset; from: string; to: string }[];
};

export type AssetValue = { id: string; name: string; value: number };

export type TeamScore = {
  teamId: string;
  mode: TeamMode;
  received: AssetValue[];
  given: AssetValue[];
  net: number; // sum received - sum given
  score: number; // 0..100
  tier: string;
};

export type TradeScore = {
  teams: TeamScore[];
  winnerTeamId: string | null; // null when the trade is even
  isEven: boolean;
};

// ---------- building blocks ----------

export function modeFromRecord(wins: number, losses: number): TeamMode {
  const games = wins + losses;
  if (games === 0) return "middle";
  const pct = wins / games;
  if (pct >= C.contenderMinWinPct) return "contender";
  if (pct <= C.rebuildMaxWinPct) return "rebuild";
  return "middle";
}

export type SeasonLine = {
  gp: number;
  pts: number; fgm: number; fga: number; ftm: number; fta: number;
  orb: number; drb: number; ast: number; stl: number; blk: number; tov: number; pf: number;
};

// Hollinger Game Score (per game averages).
export function gameScore(s: SeasonLine): number {
  return s.pts + 0.4 * s.fgm - 0.7 * s.fga - 0.4 * (s.fta - s.ftm) + 0.7 * s.orb + 0.3 * s.drb
    + s.stl + 0.7 * s.ast + 0.7 * s.blk - 0.4 * s.pf - s.tov;
}

// 60% current season + 40% previous one (100% previous if fewer than 10 games this season).
// Availability is blended with the same weights.
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

export function talent(gmsc: number, availability = 1): number {
  return C.talentScale * Math.pow(Math.max(0, gmsc - C.gmscFloor), C.talentExponent) * availability;
}

export function ageGrowth(age: number): number {
  return C.ageGrowth.find((g) => age <= g.maxAge)!.change;
}

// Salaries in dollars -> fractions of each season's projected cap.
export function salariesAsCapFraction(salaries: number[], capThisSeason: number): number[] {
  return salaries.map((s, t) => s / (capThisSeason * Math.pow(1 + C.capGrowthPerYear, t)));
}

// Context multiplier for season t; past the end of the table, keep the last value.
function contextAt(mode: TeamMode, t: number): number {
  const row = C.context[mode];
  return row[Math.min(t, row.length - 1)];
}

export function playerValue(p: PlayerAsset, mode: TeamMode): number {
  let value = 0;
  let seasonTalent = talent(p.gameScore, p.availability);
  let age = p.age;
  const seasons = Math.min(p.salaries.length, C.maxContractSeasons);
  for (let t = 0; t < seasons; t++) {
    value += Math.pow(C.discountPerSeason, t) * (contextAt(mode, t) * seasonTalent - p.salaries[t]);
    seasonTalent *= 1 + ageGrowth(age);
    age += 1;
  }
  return value;
}

export function pickBaseValue(p: PickAsset): number {
  if (p.round === 2) return C.pickBase.second;
  if (p.yearsUntilDraft > 0 || p.projectedSlot === undefined) return C.pickBase.futureFirst;
  if (p.projectedSlot <= 3) return C.pickBase.top3;
  if (p.projectedSlot <= 10) return C.pickBase.pick4to10;
  if (p.projectedSlot <= 20) return C.pickBase.pick11to20;
  return C.pickBase.pick21to30;
}

export function pickValue(p: PickAsset, mode: TeamMode): number {
  const y = p.yearsUntilDraft;
  // The drafted player helps in seasons y+1 .. y+4.
  const ctx = [1, 2, 3, 4].map((k) => contextAt(mode, y + k));
  const avgContext = ctx.reduce((a, b) => a + b, 0) / ctx.length;
  const protection = p.protected ? C.protectedPickMultiplier : 1;
  return Math.pow(C.discountPerSeason, y) * pickBaseValue(p) * avgContext * protection;
}

export function assetValue(asset: Asset, mode: TeamMode): number {
  return asset.kind === "player" ? playerValue(asset, mode) : pickValue(asset, mode);
}

export function tierFor(score: number): string {
  return C.tiers.find((t) => score <= t.max)!.label;
}

// ---------- the Trade Score ----------

// Each team values EVERYTHING (received and given) with its OWN context.
export function scoreTrade(input: TradeInput): TradeScore {
  const teams: TeamScore[] = input.teams.map(({ id, mode }) => {
    const toValue = (asset: Asset): AssetValue => ({ id: asset.id, name: asset.name, value: assetValue(asset, mode) });
    const received = input.moves.filter((m) => m.to === id).map((m) => toValue(m.asset));
    const given = input.moves.filter((m) => m.from === id).map((m) => toValue(m.asset));
    const sum = (list: AssetValue[]) => list.reduce((s, a) => s + a.value, 0);
    const net = sum(received) - sum(given);
    const score = Math.round(50 + 50 * Math.tanh(net / C.scoreScale));
    return { teamId: id, mode, received, given, net, score, tier: tierFor(score) };
  });

  const scores = teams.map((t) => t.score);
  const isEven = Math.max(...scores) - Math.min(...scores) < C.evenTradeMaxGap;
  const best = teams.reduce((a, b) => (b.score > a.score ? b : a));
  return { teams, winnerTeamId: isEven ? null : best.teamId, isEven };
}
