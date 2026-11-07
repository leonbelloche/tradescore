// The SCORE <-> DESIGN contract (see CONTRAT.md). Owned by SCORE: change only with Léon's OK.
// All asset values are fractions of the salary cap (0.30 = 30% of the cap).

export type League = "NBA"; // NHL | NFL | MLB later

export type TeamMode = "contender" | "middle" | "rebuild";

// Assets arrive already resolved (player stats, contract...), so the computation stays pure.
export type PlayerAsset = {
  kind: "player";
  id: string;
  name: string;
  age: number;
  gameScore: number; // blended Game Score (see blendGameScore)
  availability: number; // games played / games possible, 0..1
  salaries: number[]; // remaining salaries as fractions of each season's cap, this season first
};

export type PickAsset = {
  kind: "pick";
  id: string;
  name: string; // e.g. "2027 1st (prot.) · LAL"
  round: 1 | 2;
  yearsUntilDraft: number; // 0 = this season's draft
  projectedSlot?: number; // 1-30, only used for this season's 1st round picks
  protected?: boolean;
};

export type Asset = PlayerAsset | PickAsset;

export type TradeLeg = { fromTeamId: string; toTeamId: string; asset: Asset };

export type TradeTeam = {
  id: string;
  abbreviation: string;
  mode: TeamMode;
  payroll: number; // current-season payroll, in dollars
};

export type Trade = {
  league: League;
  salaryCap: number; // current-season cap, in dollars
  rules?: Record<string, unknown>; // leagues.rules_json (salary matching thresholds)
  teams: TradeTeam[];
  legs: TradeLeg[];
  // Real past trades use CBA exceptions our simplified rules don't know: score them without validating.
  skipValidation?: boolean;
};

export type AssetDetail = {
  asset: Asset;
  label: string;
  value: number; // net value for the team evaluating it
  breakdown: Record<string, number>; // calculation steps, for the Method page
};

export type Verdict = "Win" | "Loss" | "Even";

export type TeamResult = {
  teamId: string;
  score: number; // 0-100, integer
  verdict: Verdict; // Even when the trade is even, otherwise Win (>50) / Loss (<50): win-win is possible
  tier: string;
  mode: TeamMode;
  received: AssetDetail[];
  sent: AssetDetail[];
  details: Record<string, number>; // receivedTotal, sentTotal, net
};

// Salary matching result for one team, in dollars (live salary bar).
export type SalaryCheck = {
  teamId: string;
  outgoing: number;
  incoming: number;
  payrollAfter: number;
  overCapAfter: boolean;
  maxIncoming: number | null; // null when the team is under the cap after the trade
  ok: boolean;
  message: string;
};

export type ValidationResult =
  | { valid: true; checks: SalaryCheck[] }
  | { valid: false; errors: string[]; checks: SalaryCheck[] }; // messages in English

export type TradeResult =
  | { valid: true; teams: TeamResult[]; winnerTeamId: string | null; isEven: boolean }
  | { valid: false; errors: string[]; teams: [] }; // invalid trade = no score
