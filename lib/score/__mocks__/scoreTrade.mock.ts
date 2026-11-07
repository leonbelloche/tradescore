// MOCK — sample TradeResults for DESIGN (/dev/components). Fictional players and teams.
// Built with the real scoreTrade so they always match the current types and formula.
import { scoreTrade } from "../tradeScore";
import type { PickAsset, PlayerAsset, Trade, TradeResult } from "../types";

const M = 1_000_000;
const CAP = 165 * M;

const player = (id: string, name: string, age: number, gmsc: number, millions: number, years: number): PlayerAsset => ({
  kind: "player",
  id,
  name,
  age,
  gameScore: gmsc,
  availability: 1,
  salaries: Array(years).fill((millions * M) / CAP),
});
const pick = (id: string, name: string, extra: Partial<PickAsset> = {}): PickAsset => ({
  kind: "pick",
  id,
  name,
  round: 1,
  yearsUntilDraft: 1,
  ...extra,
});

// MOCK team names, keyed by team id.
export const MOCK_TEAMS: Record<string, { name: string; abbreviation: string }> = {
  aaa: { name: "Metro City Comets", abbreviation: "MET" },
  bbb: { name: "Red Rock Rattlers", abbreviation: "RRR" },
  ccc: { name: "Summit Peaks", abbreviation: "SUM" },
};

const twoTeams: Trade = {
  league: "NBA",
  salaryCap: CAP,
  teams: [
    { id: "aaa", abbreviation: "MET", mode: "contender", payroll: 180 * M },
    { id: "bbb", abbreviation: "RRR", mode: "rebuild", payroll: 122 * M },
  ],
  legs: [
    { asset: player("p1", "Marcus Bell", 27, 21, 49, 3), fromTeamId: "bbb", toTeamId: "aaa" },
    { asset: player("p2", "Caleb Moore", 22, 13, 9, 2), fromTeamId: "aaa", toTeamId: "bbb" },
    { asset: player("p3", "Theo Vasquez", 29, 12, 34, 2), fromTeamId: "aaa", toTeamId: "bbb" },
    { asset: pick("k1", "2028 1st (top-10 prot.) · MET", { protected: true }), fromTeamId: "aaa", toTeamId: "bbb" },
  ],
};

const threeTeams: Trade = {
  league: "NBA",
  salaryCap: CAP,
  teams: [
    { id: "aaa", abbreviation: "MET", mode: "contender", payroll: 180 * M },
    { id: "bbb", abbreviation: "RRR", mode: "rebuild", payroll: 122 * M },
    { id: "ccc", abbreviation: "SUM", mode: "middle", payroll: 150 * M },
  ],
  legs: [
    { asset: player("p4", "Jalen Price", 24, 11, 12.5, 2), fromTeamId: "aaa", toTeamId: "ccc" },
    { asset: player("p5", "Jordan Ellis", 22, 12, 8.8, 2), fromTeamId: "ccc", toTeamId: "bbb" },
    { asset: player("p6", "Grant Fowler", 26, 8, 12, 2), fromTeamId: "bbb", toTeamId: "aaa" },
    { asset: pick("k2", "2027 2nd · SUM", { round: 2, yearsUntilDraft: 0 }), fromTeamId: "ccc", toTeamId: "aaa" },
  ],
};

const invalid: Trade = {
  ...twoTeams,
  legs: [
    { asset: player("p7", "Rui Tanaka", 33, 9, 14, 1), fromTeamId: "aaa", toTeamId: "bbb" },
    { asset: player("p8", "Marco Bianchi", 29, 13, 30, 3), fromTeamId: "bbb", toTeamId: "aaa" },
  ],
};

// MOCK results: a valid 2-team trade, a valid 3-team trade, an invalid trade.
export const MOCK_RESULTS: { title: string; result: TradeResult }[] = [
  { title: "2-team trade", result: scoreTrade(twoTeams) },
  { title: "3-team trade", result: scoreTrade(threeTeams) },
  { title: "Invalid trade (salary matching)", result: scoreTrade(invalid) },
];
