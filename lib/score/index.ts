// Single entry point for everything outside lib/score (CONTRAT.md).
import { SCORE_CONFIG } from "./config";

export * from "./types";
export { scoreTrade, tierFor } from "./tradeScore";
export { validateTrade, rulesFor } from "@/lib/rules";
export { modeFromRecord } from "./context";
export { blendGameScore, type SeasonLine } from "./gameScore";
export { salariesAsCapFraction } from "./playerValue";

// Display tiers, worst to best: { max, label }.
export const TIERS = SCORE_CONFIG.tiers;
