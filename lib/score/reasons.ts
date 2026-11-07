// Plain-English reasons behind a team's Trade Score ("Why 9?"), built only from scoreTrade's output.
import { SCORE_CONFIG as C } from "./config";
import type { AssetDetail, TeamResult } from "./types";

// Below this (in fractions of the cap) an asset barely moves the score and is not worth a sentence.
const NOTABLE = 0.03;
const pct = (v: number) => `${Math.round(Math.abs(v) * 100)}% of the cap`;

function receivedReason(d: AssetDetail): string | null {
  if (Math.abs(d.value) < NOTABLE) return null;
  if (d.asset.kind === "pick") return `Gets ${d.label}, worth ${pct(d.value)} to them`;
  if (d.value > 0) return `${d.label} brings more than he costs (+${pct(d.value)})`;
  const causes: string[] = [];
  if (d.breakdown.availability !== undefined && d.breakdown.availability < 0.75) {
    causes.push(`only ${Math.round(d.breakdown.availability * 100)}% of games played`);
  }
  if (d.asset.age >= 31) causes.push(`at ${d.asset.age} his level is expected to drop`);
  if (causes.length === 0) causes.push("his salary is higher than his production");
  return `${d.label} costs more than he brings (−${pct(d.value)}): ${causes.join(", ")}`;
}

function sentReason(d: AssetDetail): string | null {
  if (Math.abs(d.value) < NOTABLE) return null;
  if (d.value > 0) return `Gives up ${d.label}, worth ${pct(d.value)} to them`;
  return `Gets rid of ${d.label}'s contract (saves ${pct(d.value)})`;
}

// Up to 3 reasons, biggest impact first. Each reason is about one asset.
export function reasonsFor(team: TeamResult): string[] {
  const items = [
    ...team.received.map((d) => ({ impact: Math.abs(d.value), text: receivedReason(d) })),
    ...team.sent.map((d) => ({ impact: Math.abs(d.value), text: sentReason(d) })),
  ]
    .filter((x): x is { impact: number; text: string } => x.text !== null)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3)
    .map((x) => x.text);

  if (items.length === 0) return ["Small move: nothing in this trade changes much for them."];
  // Context matters most when the team is not "middle": say how it judged the trade.
  if (team.mode === "contender" && C.context.contender[0] > 1) items.push("Judged as a win-now team: this season counts the most.");
  if (team.mode === "rebuild" && C.context.rebuild[0] < 1) items.push("Judged as a rebuilding team: the future counts more than this season.");
  return items.slice(0, 3);
}
