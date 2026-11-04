import { describe, expect, it } from "vitest";
import { nba } from "./nba";
import type { TradeMove } from "./types";

const M = 1_000_000;
const CAP = 165 * M;
const RULES = { salaryMatching: { maxIncomingRatio: 1.25, marginDollars: 250_000 } };

// Demo teams: MET is over the cap, RRR and SUM are under it.
const MET = { id: "met", abbreviation: "MET", payroll: 180.6 * M };
const RRR = { id: "rrr", abbreviation: "RRR", payroll: 121.8 * M };
const SUM = { id: "sum", abbreviation: "SUM", payroll: 149.9 * M };

const move = (from: string, to: string, millions: number): TradeMove => ({
  playerId: `${from}-${millions}`,
  from,
  to,
  salary: millions * M,
});

const check = (teams: (typeof MET)[], moves: TradeMove[]) =>
  nba.validateTrade({ salaryCap: CAP, rules: RULES, teams, moves });

describe("NBA trade rules", () => {
  it("rejects an empty trade", () => {
    const result = check([MET, RRR], []);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Add at least one player to the trade.");
  });

  it("lets a team under the cap absorb salary without sending any back", () => {
    // RRR: 121.8 + 14 = 135.8M, still under the cap. MET sheds salary.
    const result = check([MET, RRR], [move("met", "rrr", 14)]);
    expect(result.valid).toBe(true);
  });

  it("blocks an over-the-cap team taking back far more salary than it sends", () => {
    // MET sends 14M, takes back 30M -> max allowed is 14 x 1.25 + 0.25 = 17.75M.
    const result = check([MET, RRR], [move("met", "rrr", 14), move("rrr", "met", 30)]);
    expect(result.valid).toBe(false);
    const met = result.teams.find((t) => t.teamId === "met")!;
    expect(met.ok).toBe(false);
    expect(met.maxIncoming).toBe(17.75 * M);
    expect(met.message).toContain("MET would be over the cap");
    expect(met.message).toContain("send $9.8M more salary, or take back $12.3M less");
    // RRR is fine: it ends up under the cap.
    expect(result.teams.find((t) => t.teamId === "rrr")!.ok).toBe(true);
  });

  it("allows an over-the-cap team exactly at the 125% + margin limit", () => {
    // MET sends 20M, takes back 25.25M (= 20 x 1.25 + 0.25).
    const result = check([MET, RRR], [move("met", "rrr", 20), move("rrr", "met", 25.25)]);
    expect(result.valid).toBe(true);
  });

  it("blocks the same trade one dollar above the limit", () => {
    const moves = [move("met", "rrr", 20), { ...move("rrr", "met", 25.25), salary: 25.25 * M + 1 }];
    expect(check([MET, RRR], moves).valid).toBe(false);
  });

  it("requires every team of a 3-team trade to be involved", () => {
    const result = check([MET, RRR, SUM], [move("met", "rrr", 14)]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("SUM is not sending or receiving anyone.");
  });

  it("accepts a valid 3-team trade", () => {
    // MET -> RRR 14M, RRR -> SUM 9M, SUM -> MET 14M (MET takes back exactly what it sends).
    const result = check([MET, RRR, SUM], [move("met", "rrr", 14), move("rrr", "sum", 9), move("sum", "met", 14)]);
    expect(result.valid).toBe(true);
  });

  it("rejects a 4-team trade", () => {
    const fourth = { id: "hbm", abbreviation: "HBM", payroll: 168 * M };
    const result = check([MET, RRR, SUM, fourth], [move("met", "rrr", 1)]);
    expect(result.errors).toContain("A trade needs 2 or 3 teams.");
  });
});
