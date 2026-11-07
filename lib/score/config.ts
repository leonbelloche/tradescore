// Every Trade Score coefficient lives here (see CLAUDE.md, "Trade Score").
// All values are expressed as a FRACTION OF THE SALARY CAP (0.30 = 30% of the cap).

import type { TeamMode } from "./types";

export const SCORE_CONFIG = {
  // 1. Talent per season = talentScale x max(0, GmSc - gmscFloor)^talentExponent x availability
  talentScale: 0.00488,
  gmscFloor: 6,
  talentExponent: 1.56,

  // Game Score blend: 60% current season + 40% previous season,
  // or 100% previous season when fewer than `minGamesCurrentSeason` games were played.
  currentSeasonWeight: 0.6,
  minGamesCurrentSeason: 10,
  gamesPerSeason: 82,

  // 2. Talent change applied each following season, by age that season.
  ageGrowth: [
    { maxAge: 22, change: 0.08 },
    { maxAge: 25, change: 0.04 },
    { maxAge: 28, change: 0 },
    { maxAge: 30, change: -0.05 },
    { maxAge: 32, change: -0.1 },
    { maxAge: Infinity, change: -0.15 },
  ],

  // 3. Player value over his contract.
  maxContractSeasons: 5,
  discountPerSeason: 0.9, // value of season t is multiplied by 0.9^t
  capGrowthPerYear: 0.07,
  // Cost of a contract = salaryWeight x (salary - replacementSalary), never below 0.
  // - replacementSalary ~ a minimum contract (~$2.1M): anyone can sign a replacement for that,
  //   so a minimum-salary player costs nothing extra.
  // - salaryWeight < 1: a saved dollar is worth less than a dollar of talent.
  // Calibrated so that a fairly-paid role player is ~0 and giving away a star for nothing is a clear loss.
  salaryWeight: 0.7,
  replacementSalary: 0.013,

  // 4. Context of the team valuing the asset, season by season (index 0 = this season).
  context: {
    contender: [1.5, 1.2, 1.0, 0.9, 0.8],
    middle: [1.0, 1.0, 1.0, 1.0, 1.0],
    rebuild: [0.6, 0.8, 1.0, 1.1, 1.1],
  } satisfies Record<TeamMode, number[]>,
  // Automatic mode from the current win%.
  contenderMinWinPct: 0.6,
  rebuildMaxWinPct: 0.4,

  // 5. Draft picks: base value by projected slot (this year's 1st round), else flat values.
  pickBase: {
    top3: 0.5,
    pick4to10: 0.3,
    pick11to20: 0.15,
    pick21to30: 0.08,
    futureFirst: 0.18, // 1st round pick that is NOT in this year's draft
    second: 0.02,
  },
  protectedPickMultiplier: 0.7,

  // 6. Score = round(50 + 50 x tanh((received - given) / scoreScale))
  scoreScale: 0.25,
  evenTradeMaxGap: 5, // score gap below this = "Even trade"

  // Display tiers, from worst to best (score <= max).
  tiers: [
    { max: 20, label: "Fleeced" },
    { max: 40, label: "Lost It" },
    { max: 59, label: "Fair Deal" },
    { max: 79, label: "Won It" },
    { max: 100, label: "Heist!" },
  ],
} as const;
