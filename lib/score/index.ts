// Single entry point for everything outside lib/score (CONTRAT.md).
import { SCORE_CONFIG } from "./config";

export * from "./types";
export { scoreTrade, tierFor, gradeFor } from "./tradeScore";
export { reasonsFor } from "./reasons";
export { validateTrade, rulesFor } from "@/lib/rules";
export { modeFromRecord } from "./context";
export { blendGameScore, type SeasonLine } from "./gameScore";
export { salariesAsCapFraction, playerTradeValue } from "./playerValue";

// Display tiers, worst to best: { max, label }.
export const TIERS = SCORE_CONFIG.tiers;
export const GRADES = SCORE_CONFIG.grades;
export const SCORE_RANGE = { min: SCORE_CONFIG.scoreMin, max: SCORE_CONFIG.scoreMax };
