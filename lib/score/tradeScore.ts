// scoreTrade(trade) -> TradeResult. Validates first (unless skipValidation), then scores every team.
import { validateTrade } from "@/lib/rules";
import { SCORE_CONFIG as C } from "./config";
import { pickValue } from "./pickValue";
import { playerValue } from "./playerValue";
import { toScore } from "./scale";
import type { Asset, AssetDetail, TeamMode, TeamResult, Trade, TradeResult, Verdict } from "./types";

export function tierFor(score: number): string {
  return C.tiers.find((t) => score <= t.max)!.label;
}

export function gradeFor(score: number): string {
  return C.grades.find((g) => score <= g.max)!.grade;
}

export function assetDetail(asset: Asset, mode: TeamMode): AssetDetail {
  const { value, breakdown } = asset.kind === "player" ? playerValue(asset, mode) : pickValue(asset, mode);
  return { asset, label: asset.name, value, breakdown };
}

// Each team values EVERYTHING (received and sent) with its OWN context.
export function scoreTrade(trade: Trade): TradeResult {
  if (!trade.skipValidation) {
    const validation = validateTrade(trade);
    if (!validation.valid) return { valid: false, errors: validation.errors, teams: [] };
  }

  const scored = trade.teams.map(({ id, mode }) => {
    const received = trade.legs.filter((l) => l.toTeamId === id).map((l) => assetDetail(l.asset, mode));
    const sent = trade.legs.filter((l) => l.fromTeamId === id).map((l) => assetDetail(l.asset, mode));
    const sum = (list: AssetDetail[]) => list.reduce((s, a) => s + a.value, 0);
    const receivedTotal = sum(received);
    const sentTotal = sum(sent);
    const net = receivedTotal - sentTotal;
    const score = toScore(net);
    return { teamId: id, mode, received, sent, score, details: { receivedTotal, sentTotal, net } };
  });

  const scores = scored.map((t) => t.score);
  const isEven = Math.max(...scores) - Math.min(...scores) < C.evenTradeMaxGap;
  const verdictOf = (score: number): Verdict => (isEven || score === 50 ? "Even" : score > 50 ? "Win" : "Loss");
  const teams: TeamResult[] = scored.map((t) => ({ ...t, verdict: verdictOf(t.score), tier: tierFor(t.score) }));
  const best = teams.reduce((a, b) => (b.score > a.score ? b : a));

  return { valid: true, teams, winnerTeamId: isEven ? null : best.teamId, isEven };
}
