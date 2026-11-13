// Dev helper: prints the numbers the score tests check, with the current config.
// Run: npx tsx scripts/score-probe.mts
import { playerTradeValue, playerValue, talent } from "@/lib/score/playerValue";
import { reasonsFor } from "@/lib/score/reasons";
import { scoreTrade } from "@/lib/score/tradeScore";
import type { PickAsset, PlayerAsset, TeamMode, TradeLeg } from "@/lib/score/types";

const player = (name: string, age: number, gmsc: number, salary: number, years: number): PlayerAsset => ({ kind: "player", id: name, name, age, gameScore: gmsc, availability: 1, salaries: Array(years).fill(salary) });
const pick = (name: string, extra: Partial<PickAsset>): PickAsset => ({ kind: "pick", id: name, name, round: 1, yearsUntilDraft: 0, ...extra });
const leg = (asset: PlayerAsset | PickAsset, fromTeamId: string, toTeamId: string): TradeLeg => ({ asset, fromTeamId, toTeamId });
const run = (teams: [string, TeamMode][], legs: TradeLeg[]) => {
  const r = scoreTrade({ league: "NBA", salaryCap: 165_000_000, teams: teams.map(([id, mode]) => ({ id, abbreviation: id, mode, payroll: 0 })), legs, skipValidation: true });
  if (!r.valid) throw new Error("invalid");
  return r;
};
const scores = (r: ReturnType<typeof run>) => Object.fromEntries(r.teams.map((t) => [t.teamId, t.score]));

console.log("talent 12/15/20/25/3:", [12, 15, 20, 25, 3].map((g) => talent(g).toFixed(3)).join(" "));
console.log("ref 1:", scores(run([["A", "contender"], ["B", "rebuild"]], [leg(player("All-Star", 27, 21, 0.3, 3), "B", "A"), leg(player("Young", 22, 13, 0.06, 2), "A", "B"), leg(pick("Future 1st", { yearsUntilDraft: 1 }), "A", "B")])));
console.log("ref 2:", scores(run([["A", "middle"], ["B", "middle"]], [leg(player("MVP", 26, 28, 0.32, 4), "B", "A"), leg(player("Vet", 29, 11, 0.15, 2), "A", "B")])));
console.log("ref 3:", scores(run([["A", "middle"], ["B", "middle"]], [leg(player("P1", 26, 15, 0.15, 3), "A", "B"), leg(player("P2", 25, 14.5, 0.14, 3), "B", "A")])));
console.log("ref 4:", scores(run([["A", "contender"], ["B", "rebuild"]], [leg(player("Old vet", 32, 9, 0.25, 2), "A", "B"), leg(pick("Lottery pick", { yearsUntilDraft: 0, projectedSlot: 7 }), "A", "B"), leg(player("Role player", 28, 11, 0.08, 1), "B", "A")])));
console.log("star gift:", scores(run([["giver", "contender"], ["taker", "rebuild"]], [leg(player("Star", 27, 21, 0.3, 3), "giver", "taker")])));
console.log("bench GmSc 4 min gift:", scores(run([["giver", "contender"], ["taker", "rebuild"]], [leg(player("Bench", 30, 4, 0.013, 1), "giver", "taker")])));
console.log("role GmSc 12 at 0.19 x2:", playerValue(player("Role", 27, 12, 0.19, 2), "middle").value.toFixed(4));
console.log("deep bench GmSc 3:", playerValue(player("Deep", 28, 3, 0.05, 1), "middle"));
const r = run([["A", "middle"], ["B", "middle"]], [leg(player("MVP", 26, 28, 0.32, 4), "B", "A"), leg({ ...player("Injured vet", 33, 18, 0.3, 2), availability: 0.5 }, "A", "B")]);
console.log("reasons B:", reasonsFor(r.teams.find((t) => t.teamId === "B")!));
console.log("TV star/bad/min:", playerTradeValue(player("x", 26, 25, 0.3, 4)).score, playerTradeValue(player("x", 26, 9, 0.25, 3)).score, playerTradeValue(player("x", 26, 5, 0.013, 1)).score);
