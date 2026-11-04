// League-agnostic trade types. Every league (NBA, NHL, ...) implements LeagueRules.

export type TradeMove = {
  playerId: string;
  from: string; // team id
  to: string; // team id
  salary: number; // current-season salary, in dollars
};

export type TradeValidationInput = {
  salaryCap: number;
  rules: Record<string, unknown>; // leagues.rules_json from the database
  teams: { id: string; abbreviation: string; payroll: number }[];
  moves: TradeMove[];
};

export type TeamCheck = {
  teamId: string;
  outgoing: number;
  incoming: number;
  payrollAfter: number;
  overCapAfter: boolean;
  maxIncoming: number | null; // null when the team is under the cap after the trade
  ok: boolean;
  message: string;
};

export type TradeValidation = {
  valid: boolean;
  teams: TeamCheck[];
  errors: string[]; // human-readable reasons why the trade is not allowed
};

export type LeagueRules = {
  minTeams: number;
  maxTeams: number;
  validateTrade(input: TradeValidationInput): TradeValidation;
};
