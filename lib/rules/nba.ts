// Simplified V1 NBA trade rules (CLAUDE.md, "Règles de validation NBA"):
// - 2 or 3 teams, every team sends or receives at least one asset.
// - A team OVER the cap after the trade can take back at most maxIncomingRatio × outgoing + marginDollars.
// - A team under the cap after the trade can absorb any salary.
// Thresholds come from leagues.rules_json; NBA_DEFAULTS are only fallbacks.
import { formatMoney } from "@/lib/format";
import type { SalaryCheck, Trade, ValidationResult } from "@/lib/score/types";

export const NBA_DEFAULTS = { minTeams: 2, maxTeams: 3, maxIncomingRatio: 1.25, marginDollars: 250_000 };

// Round UP to the next $0.1M so the suggested fix is always enough.
const ceilTenth = (dollars: number) => Math.ceil(dollars / 100_000) * 100_000;

export function validateNbaTrade(trade: Trade): ValidationResult {
  const cfg = {
    ...NBA_DEFAULTS,
    ...((trade.rules?.salaryMatching as Partial<typeof NBA_DEFAULTS> | undefined) ?? {}),
  };
  const errors: string[] = [];

  if (trade.teams.length < cfg.minTeams || trade.teams.length > cfg.maxTeams) {
    errors.push(`A trade needs ${cfg.minTeams} or ${cfg.maxTeams} teams.`);
  }
  if (trade.legs.length === 0) errors.push("Add at least one player or pick to the trade.");

  // Current-season salary of an asset, in dollars (picks carry no salary).
  const salaryOf = (leg: Trade["legs"][number]) =>
    leg.asset.kind === "player" ? (leg.asset.salaries[0] ?? 0) * trade.salaryCap : 0;

  const checks: SalaryCheck[] = trade.teams.map((team) => {
    const outgoing = trade.legs.filter((l) => l.fromTeamId === team.id).reduce((s, l) => s + salaryOf(l), 0);
    const incoming = trade.legs.filter((l) => l.toTeamId === team.id).reduce((s, l) => s + salaryOf(l), 0);
    const involved = trade.legs.some((l) => l.fromTeamId === team.id || l.toTeamId === team.id);
    const payrollAfter = team.payroll - outgoing + incoming;
    const overCapAfter = payrollAfter > trade.salaryCap;
    const maxIncoming = overCapAfter ? outgoing * cfg.maxIncomingRatio + cfg.marginDollars : null;
    const base = { teamId: team.id, outgoing, incoming, payrollAfter, overCapAfter, maxIncoming };

    if (trade.legs.length > 0 && !involved) {
      return { ...base, ok: false, message: `${team.abbreviation} is not sending or receiving anything.` };
    }
    if (maxIncoming === null) {
      return { ...base, ok: true, message: `Under the cap after the trade (${formatMoney(trade.salaryCap - payrollAfter)} of room).` };
    }
    if (incoming <= maxIncoming) {
      return {
        ...base,
        ok: true,
        message: `Over the cap, but salaries match: takes back ${formatMoney(incoming)} for ${formatMoney(outgoing)} sent (max ${formatMoney(maxIncoming)}).`,
      };
    }
    const pct = Math.round(cfg.maxIncomingRatio * 100);
    const sendMore = ceilTenth((incoming - cfg.marginDollars) / cfg.maxIncomingRatio - outgoing);
    const takeLess = ceilTenth(incoming - maxIncoming);
    return {
      ...base,
      ok: false,
      message:
        `${team.abbreviation} would be over the cap after this trade, so it can only take back ` +
        `${pct}% of the salary it sends + ${formatMoney(cfg.marginDollars)}. ` +
        `It sends ${formatMoney(outgoing)} and takes back ${formatMoney(incoming)} (max ${formatMoney(maxIncoming)}). ` +
        `Fix: send ${formatMoney(sendMore)} more salary, or take back ${formatMoney(takeLess)} less.`,
    };
  });

  errors.push(...checks.filter((c) => !c.ok).map((c) => c.message));
  return errors.length ? { valid: false, errors, checks } : { valid: true, checks };
}
