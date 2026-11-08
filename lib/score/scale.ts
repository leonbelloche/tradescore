// Net value (fraction of the cap) -> score between 1 and 99.
import { SCORE_CONFIG as C } from "./config";

export function toScore(net: number): number {
  const raw = Math.round(50 + 50 * Math.tanh(net / C.scoreScale));
  return Math.min(C.scoreMax, Math.max(C.scoreMin, raw));
}
