import { describe, expect, it } from "vitest";
import type { PickAsset, PlayerAsset, Trade, TradeLeg } from "@/lib/score/types";
import { validateTrade } from "./index";

const M = 1_000_000;
const CAP = 165 * M;
const RULES = { salaryMatching: { maxIncomingRatio: 1.25, marginDollars: 250_000 } };

// MET is over the cap, RRR and SUM are under it.
const MET = { id: "met", abbreviation: "MET", mode: "contender" as const, payroll: 180.6 * M };
const RRR = { id: "rrr", abbreviation: "RRR", mode: "rebuild" as const, payroll: 121.8 * M };
const SUM = { id: "sum", abbreviation: "SUM", mode: "middle" as const, payroll: 149.9 * M };

// A player whose current salary is `millions` (stored as a fraction of the cap, like real data).
const p = (from: string, to: string, millions: number): TradeLeg => ({
  fromTeamId: from,
  toTeamId: to,
  asset: { kind: "player", id: `${from}-${millions}`, name: `${millions}M`, age: 27, gameScore: 12, availability: 1, salaries: [(millions * M) / CAP] } satisfies PlayerAsset,
});
const pk = (from: string, to: string): TradeLeg => ({
  fromTeamId: from,
  toTeamId: to,
  asset: { kind: "pick", id: `pick-${from}`, name: "2028 2nd", round: 2, yearsUntilDraft: 1 } satisfies PickAsset,
});
const check = (teams: Trade["teams"], legs: TradeLeg[]) => validateTrade({ league: "NBA", salaryCap: CAP, rules: RULES, teams, legs });

describe("NBA trade rules", () => {
  it("rejects an empty trade", () => {
    const r = check([MET, RRR], []);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors).toContain("Add at least one player or pick to the trade.");
  });

  it("lets a team under the cap absorb salary without sending any back", () => {
    expect(check([MET, RRR], [p("met", "rrr", 14)]).valid).toBe(true);
  });

  it("blocks an over-the-cap team taking back far more salary than it sends, and says by how much", () => {
    const r = check([MET, RRR], [p("met", "rrr", 14), p("rrr", "met", 30)]);
    expect(r.valid).toBe(false);
    const met = r.checks.find((c) => c.teamId === "met")!;
    expect(met.ok).toBe(false);
    expect(met.maxIncoming).toBeCloseTo(17.75 * M, 0);
    expect(met.message).toContain("MET would be over the cap");
    expect(met.message).toContain("send $9.8M more salary, or take back $12.3M less");
    expect(r.checks.find((c) => c.teamId === "rrr")!.ok).toBe(true);
  });

  it("allows an over-the-cap team just under the 125% + margin limit", () => {
    expect(check([MET, RRR], [p("met", "rrr", 20), p("rrr", "met", 25.249)]).valid).toBe(true);
  });

  it("blocks the same trade just over the limit", () => {
    expect(check([MET, RRR], [p("met", "rrr", 20), p("rrr", "met", 25.26)]).valid).toBe(false);
  });

  it("requires every team of a 3-team trade to be involved", () => {
    const r = check([MET, RRR, SUM], [p("met", "rrr", 14)]);
    if (!r.valid) expect(r.errors).toContain("SUM is not sending or receiving anything.");
    else throw new Error("expected invalid");
  });

  it("a team sending only a pick counts as involved", () => {
    expect(check([MET, RRR], [p("met", "rrr", 5), pk("rrr", "met")]).valid).toBe(true);
  });

  it("3-team trade with only one team over the limit: only that team is reported", () => {
    // MET sends 10M, receives 20M (max 12.75M) -> fails. RRR and SUM stay under the cap.
    const r = check([MET, RRR, SUM], [p("met", "rrr", 10), p("rrr", "sum", 3), p("sum", "met", 20)]);
    expect(r.valid).toBe(false);
    if (!r.valid) {
      expect(r.errors).toHaveLength(1);
      expect(r.errors[0]).toContain("MET");
    }
  });

  it("accepts a valid 3-team trade", () => {
    expect(check([MET, RRR, SUM], [p("met", "rrr", 14), p("rrr", "sum", 9), p("sum", "met", 14)]).valid).toBe(true);
  });

  it("rejects a 4-team trade", () => {
    const HBM = { id: "hbm", abbreviation: "HBM", mode: "middle" as const, payroll: 168 * M };
    const r = check([MET, RRR, SUM, HBM], [p("met", "rrr", 1)]);
    if (!r.valid) expect(r.errors).toContain("A trade needs 2 or 3 teams.");
    else throw new Error("expected invalid");
  });
});
