// Player value: talent, age projection and net value over the contract (max 5 seasons).
import { SCORE_CONFIG as C } from "./config";
import { contextAt } from "./context";
import { toScore } from "./scale";
import type { PlayerAsset, TeamMode } from "./types";

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

// Value = Σ_t 0.9^t × (Context[mode][t] × Talent_t − Cost_t), Cost_t = salaryWeight × max(0, salary_t − replacement).
// Returns the value and every step, for the Method page.
export function playerValue(p: PlayerAsset, mode: TeamMode): { value: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {
    gameScore: p.gameScore,
    availability: p.availability,
    talentNow: talent(p.gameScore, p.availability),
  };
  let value = 0;
  // Talent at full availability; each season then applies its own availability (this season's in full, later ones partly recovered).
  let fullTalent = talent(p.gameScore, 1);
  const futureAvailability =
    p.availability < C.futureAvailabilityTarget ? p.availability + (C.futureAvailabilityTarget - p.availability) * C.injuryRecovery : p.availability;
  breakdown.futureAvailability = futureAvailability;
  let age = p.age;
  const seasons = Math.min(p.salaries.length, C.maxContractSeasons);
  for (let t = 0; t < seasons; t++) {
    const cost = C.salaryWeight * Math.max(0, p.salaries[t] - C.replacementSalary);
    const seasonTalent = fullTalent * (t === 0 ? p.availability : futureAvailability);
    const net = Math.pow(C.discountPerSeason, t) * (contextAt(mode, t) * seasonTalent - cost);
    breakdown[`season${t + 1}Net`] = net;
    value += net;
    fullTalent *= 1 + ageGrowth(age);
    age += 1;
  }
  // A bad contract hurts less than talent helps (1 = counted in full).
  if (value < 0) value *= C.negativeValueWeight;
  breakdown.seasons = seasons;
  breakdown.value = value;
  return { value, breakdown };
}

// Trade Value /100: the Trade Score a team in `mode` would get for receiving this player for nothing.
// 50 = neutral (fair contract), above = surplus value, below = overpaid.
export function playerTradeValue(p: PlayerAsset, mode: TeamMode = "middle"): { value: number; score: number } {
  const { value } = playerValue(p, mode);
  return { value, score: toScore(value) };
}
