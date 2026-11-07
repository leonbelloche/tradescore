// Exploration only: tries coefficient variants IN MEMORY and reports calibration hits + reference trades.
// Nothing is written. Run: node --env-file=.env.local --import tsx scripts/calibration/explore.mts
import { readFileSync } from "node:fs";
import { SCORE_CONFIG } from "@/lib/score/config";
import { scoreTrade, type PickAsset, type PlayerAsset, type TeamMode, type TradeLeg } from "@/lib/score";
import { getScoredTrades } from "@/lib/trades/scored";

type Cal = { slug: string; analystWinner: string };
const expected: Cal[] = JSON.parse(readFileSync(new URL("../../data/calibration_trades.json", import.meta.url), "utf8"));
const C = SCORE_CONFIG as unknown as Record<string, unknown> & { pickBase: Record<string, number>; context: Record<string, number[]> };
const original = structuredClone(SCORE_CONFIG);

// The 4 reference trades of CLAUDE.md, to see what a variant does to them.
const pl = (n: string, a: number, g: number, s: number, y: number): PlayerAsset => ({ kind: "player", id: n, name: n, age: a, gameScore: g, availability: 1, salaries: Array(y).fill(s) });
const pk = (n: string, x: Partial<PickAsset>): PickAsset => ({ kind: "pick", id: n, name: n, round: 1, yearsUntilDraft: 0, ...x });
const ref = (teams: [string, TeamMode][], legs: TradeLeg[]) => {
  const r = scoreTrade({ league: "NBA", salaryCap: 1, teams: teams.map(([id, mode]) => ({ id, abbreviation: id, mode, payroll: 0 })), legs, skipValidation: true });
  return r.valid ? r.teams.map((t) => t.score).join("/") : "invalid";
};
const L = (asset: PlayerAsset | PickAsset, fromTeamId: string, toTeamId: string): TradeLeg => ({ asset, fromTeamId, toTeamId });
const references = () => [
  ref([["A", "contender"], ["B", "rebuild"]], [L(pl("AS", 27, 21, 0.3, 3), "B", "A"), L(pl("Y", 22, 13, 0.06, 2), "A", "B"), L(pk("F", { yearsUntilDraft: 1 }), "A", "B")]),
  ref([["A", "middle"], ["B", "middle"]], [L(pl("MVP", 26, 28, 0.32, 4), "B", "A"), L(pl("V", 29, 11, 0.15, 2), "A", "B")]),
  ref([["A", "middle"], ["B", "middle"]], [L(pl("P1", 26, 15, 0.15, 3), "A", "B"), L(pl("P2", 25, 14.5, 0.14, 3), "B", "A")]),
  ref([["A", "contender"], ["B", "rebuild"]], [L(pl("O", 32, 9, 0.25, 2), "A", "B"), L(pk("L", { projectedSlot: 7 }), "A", "B"), L(pl("R", 28, 11, 0.08, 1), "B", "A")]),
].join("  ");

async function hits() {
  const trades = new Map((await getScoredTrades()).map((t) => [t.id, t]));
  return expected.filter((e) => {
    const t = trades.get(e.slug);
    return t && (t.winner ? t.winner.team.abbreviation : "even").toLowerCase() === e.analystWinner.toLowerCase();
  }).length;
}

const variants: { name: string; apply: () => void }[] = [
  { name: "current", apply: () => {} },
  { name: "contender season0 1.3", apply: () => (C.context.contender[0] = 1.3) },
  { name: "2nd-round pick 0.05", apply: () => (C.pickBase.second = 0.05) },
  { name: "2nd-round pick 0.08", apply: () => (C.pickBase.second = 0.08) },
  { name: "salaryWeight 0.5", apply: () => (C.salaryWeight = 0.5) },
  { name: "salaryWeight 0.4", apply: () => (C.salaryWeight = 0.4) },
  { name: "talentScale 0.006", apply: () => (C.talentScale = 0.006) },
  { name: "talentScale 0.007", apply: () => (C.talentScale = 0.007) },
  { name: "salaryWeight 0.5 + 2nd 0.05", apply: () => ((C.salaryWeight = 0.5), (C.pickBase.second = 0.05)) },
  { name: "talent 0.006 + 2nd 0.05", apply: () => ((C.talentScale = 0.006), (C.pickBase.second = 0.05)) },
  { name: "talent 0.006 + salaryW 0.5 + 2nd 0.05", apply: () => ((C.talentScale = 0.006), (C.salaryWeight = 0.5), (C.pickBase.second = 0.05)) },
  // Flatter talent curve, keeping GmSc 20 = 30% of the cap: scale = 0.30 / 14^exp.
  { name: "curve exp 1.3 (GmSc20=0.30)", apply: () => ((C.talentExponent = 1.3), (C.talentScale = 0.3 / Math.pow(14, 1.3))) },
  { name: "curve exp 1.15 (GmSc20=0.30)", apply: () => ((C.talentExponent = 1.15), (C.talentScale = 0.3 / Math.pow(14, 1.15))) },
  { name: "curve 1.3 + 2nd 0.04", apply: () => ((C.talentExponent = 1.3), (C.talentScale = 0.3 / Math.pow(14, 1.3)), (C.pickBase.second = 0.04)) },
  { name: "curve 1.15 + 2nd 0.04", apply: () => ((C.talentExponent = 1.15), (C.talentScale = 0.3 / Math.pow(14, 1.15)), (C.pickBase.second = 0.04)) },
  { name: "floor GmSc 4 + curve 1.3", apply: () => ((C.gmscFloor = 4), (C.talentExponent = 1.3), (C.talentScale = 0.3 / Math.pow(16, 1.3))) },
  { name: "floor 4 + curve 1.3 + 2nd 0.04", apply: () => ((C.gmscFloor = 4), (C.talentExponent = 1.3), (C.talentScale = 0.3 / Math.pow(16, 1.3)), (C.pickBase.second = 0.04)) },
];

for (const v of variants) {
  Object.assign(C, structuredClone(original));
  v.apply();
  console.log(`${v.name.padEnd(40)} ${String(await hits()).padStart(2)}/${expected.length}   reference: ${references()}`);
}
process.exit(0);
