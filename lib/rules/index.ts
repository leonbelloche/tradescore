// One rules file per league. Adding the NHL later = write lib/rules/nhl.ts and add it here.
import type { League, Trade, ValidationResult } from "@/lib/score/types";
import { NBA_DEFAULTS, validateNbaTrade } from "./nba";

type LeagueRules = { minTeams: number; maxTeams: number; validate(trade: Trade): ValidationResult };

const RULES: Record<League, LeagueRules> = {
  NBA: { minTeams: NBA_DEFAULTS.minTeams, maxTeams: NBA_DEFAULTS.maxTeams, validate: validateNbaTrade },
};

export function rulesFor(league: League): LeagueRules {
  return RULES[league];
}

export function validateTrade(trade: Trade): ValidationResult {
  return rulesFor(trade.league).validate(trade);
}
