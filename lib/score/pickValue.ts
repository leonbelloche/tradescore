// Draft pick value: projected slot, years until the draft (discount) and protection.
import { SCORE_CONFIG as C } from "./config";
import { contextAt } from "./context";
import type { PickAsset, TeamMode } from "./types";

export function pickBaseValue(p: PickAsset): number {
  if (p.round === 2) return C.pickBase.second;
  if (p.yearsUntilDraft > 0 || p.projectedSlot === undefined) return C.pickBase.futureFirst;
  if (p.projectedSlot <= 3) return C.pickBase.top3;
  if (p.projectedSlot <= 10) return C.pickBase.pick4to10;
  if (p.projectedSlot <= 20) return C.pickBase.pick11to20;
  return C.pickBase.pick21to30;
}

// PickValue = 0.9^years × Base × mean(Context[mode][y+1..y+4]) × (0.7 if protected).
export function pickValue(p: PickAsset, mode: TeamMode): { value: number; breakdown: Record<string, number> } {
  const y = p.yearsUntilDraft;
  // The drafted player helps in seasons y+1 .. y+4.
  const ctx = [1, 2, 3, 4].map((k) => contextAt(mode, y + k));
  const avgContext = ctx.reduce((a, b) => a + b, 0) / ctx.length;
  const protection = p.protected ? C.protectedPickMultiplier : 1;
  const discount = Math.pow(C.discountPerSeason, y);
  const base = pickBaseValue(p);
  const value = discount * base * avgContext * protection;
  return { value, breakdown: { base, yearsUntilDraft: y, discount, avgContext, protection, value } };
}
