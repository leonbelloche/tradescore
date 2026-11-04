import { nba } from "./nba";
import type { LeagueRules } from "./types";

// One rules engine per league. Adding the NHL later = add an "nhl" entry here.
const RULES: Record<string, LeagueRules> = { nba };

export function getLeagueRules(leagueId: string): LeagueRules {
  const rules = RULES[leagueId];
  if (!rules) throw new Error(`No trade rules for league "${leagueId}"`);
  return rules;
}
