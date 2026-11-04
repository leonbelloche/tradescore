import { formatMoney } from "@/lib/format";
import type { LeagueRules, TeamCheck, TradeValidationInput } from "./types";

// Simplified V1 NBA rules:
// - 2 or 3 teams, every team must send or receive at least one player.
// - A team that is OVER the cap after the trade can take back at most
//   maxIncomingRatio x outgoing salary + marginDollars.
// - A team under the cap after the trade can absorb any salary.
// Thresholds come from leagues.rules_json; these are only fallbacks.
const DEFAULTS = { maxIncomingRatio: 1.25, marginDollars: 250_000 };

// Round UP to the next $0.1M so suggestions are always enough.
const ceilTenth = (dollars: number) => Math.ceil(dollars / 100_000) * 100_000;

function validateTrade(input: TradeValidationInput) {
  const cfg = {
    ...DEFAULTS,
    ...((input.rules.salaryMatching as Partial<typeof DEFAULTS> | undefined) ?? {}),
  };
  const errors: string[] = [];

  if (input.teams.length < nba.minTeams || input.teams.length > nba.maxTeams) {
    errors.push(`A trade needs ${nba.minTeams} or ${nba.maxTeams} teams.`);
  }
  if (input.moves.length === 0) {
    errors.push("Add at least one player to the trade.");
  }

  const teams: TeamCheck[] = input.teams.map((team) => {
    const outgoing = input.moves.filter((m) => m.from === team.id).reduce((s, m) => s + m.salary, 0);
    const incoming = input.moves.filter((m) => m.to === team.id).reduce((s, m) => s + m.salary, 0);
    const involved = input.moves.some((m) => m.from === team.id || m.to === team.id);
    const payrollAfter = team.payroll - outgoing + incoming;
    const overCapAfter = payrollAfter > input.salaryCap;
    const maxIncoming = overCapAfter ? outgoing * cfg.maxIncomingRatio + cfg.marginDollars : null;
    const base = { teamId: team.id, outgoing, incoming, payrollAfter, overCapAfter, maxIncoming };

    if (input.moves.length > 0 && !involved) {
      return { ...base, ok: false, message: `${team.abbreviation} is not sending or receiving anyone.` };
    }
    if (!overCapAfter) {
      return {
        ...base,
        ok: true,
        message: `Under the cap after the trade (${formatMoney(input.salaryCap - payrollAfter)} of room).`,
      };
    }
    if (incoming <= maxIncoming!) {
      return {
        ...base,
        ok: true,
        message: `Over the cap, but salaries match: takes back ${formatMoney(incoming)} for ${formatMoney(outgoing)} sent (max ${formatMoney(maxIncoming!)}).`,
      };
    }

    const pct = Math.round(cfg.maxIncomingRatio * 100);
    const sendMore = ceilTenth((incoming - cfg.marginDollars) / cfg.maxIncomingRatio - outgoing);
    const takeLess = ceilTenth(incoming - maxIncoming!);
    return {
      ...base,
      ok: false,
      message:
        `${team.abbreviation} would be over the cap after this trade, so it can only take back ` +
        `${pct}% of the salary it sends + ${formatMoney(cfg.marginDollars)}. ` +
        `It sends ${formatMoney(outgoing)} and takes back ${formatMoney(incoming)} (max ${formatMoney(maxIncoming!)}). ` +
        `Fix: send ${formatMoney(sendMore)} more salary, or take back ${formatMoney(takeLess)} less.`,
    };
  });

  errors.push(...teams.filter((t) => !t.ok).map((t) => t.message));
  return { valid: errors.length === 0, teams, errors };
}

export const nba: LeagueRules = { minTeams: 2, maxTeams: 3, validateTrade };
