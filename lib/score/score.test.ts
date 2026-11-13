import { describe, expect, it } from "vitest";
import { blendGameScore } from "./gameScore";
import { modeFromRecord } from "./context";
import { pickValue } from "./pickValue";
import { ageGrowth, playerTradeValue, playerValue, talent } from "./playerValue";
import { reasonsFor } from "./reasons";
import { gradeFor, scoreTrade, tierFor } from "./tradeScore";
import type { PickAsset, PlayerAsset, TeamMode, Trade, TradeLeg, TradeResult } from "./types";

// Test helpers: Availability = 1, no cap growth (as stated in CLAUDE.md).
const player = (name: string, age: number, gmsc: number, salary: number, years: number): PlayerAsset => ({
  kind: "player",
  id: name,
  name,
  age,
  gameScore: gmsc,
  availability: 1,
  salaries: Array(years).fill(salary),
});
const pick = (name: string, extra: Partial<PickAsset>): PickAsset => ({
  kind: "pick",
  id: name,
  name,
  round: 1,
  yearsUntilDraft: 0,
  ...extra,
});
const leg = (asset: PlayerAsset | PickAsset, fromTeamId: string, toTeamId: string): TradeLeg => ({ asset, fromTeamId, toTeamId });

// Abstract trades: no payroll known, so salary rules are skipped (they have their own tests in lib/rules).
const trade = (teams: [string, TeamMode][], legs: TradeLeg[]): Trade => ({
  league: "NBA",
  salaryCap: 165_000_000,
  teams: teams.map(([id, mode]) => ({ id, abbreviation: id, mode, payroll: 0 })),
  legs,
  skipValidation: true,
});

function valid(result: TradeResult) {
  if (!result.valid) throw new Error(`expected a valid trade, got: ${result.errors.join(" ")}`);
  return result;
}
const scoresOf = (result: TradeResult) => Object.fromEntries(valid(result).teams.map((t) => [t.teamId, t.score]));

// Expected scores updated on 2026-11-12 after the calibration validated by Léon (gmscFloor 4, bad contracts x0.3,
// future 1st 0.12, 2nd 0.02: 6/15 -> 9/15 same winner as the analysts).
// Before: 87/66, 99/1, 49/51, 50/56 (salary fix of 2026-11-04); original spec: 54/92, 100/0, 50/50, 73/31.
describe("Trade Score — reference trades from CLAUDE.md", () => {
  it("1. contender gets an All-Star, rebuild gets a young player + future 1st -> 96 / 39", () => {
    const result = scoreTrade(
      trade([["A", "contender"], ["B", "rebuild"]], [
        leg(player("All-Star", 27, 21, 0.3, 3), "B", "A"),
        leg(player("Young", 22, 13, 0.06, 2), "A", "B"),
        leg(pick("Future 1st", { yearsUntilDraft: 1 }), "A", "B"),
      ]),
    );
    expect(scoresOf(result)).toEqual({ A: 96, B: 39 });
    expect(valid(result).teams.map((t) => t.verdict)).toEqual(["Win", "Loss"]);
  });

  it("2. middle team gets an MVP for a declining player -> 99 / 1 (capped)", () => {
    const result = scoreTrade(
      trade([["A", "middle"], ["B", "middle"]], [
        leg(player("MVP", 26, 28, 0.32, 4), "B", "A"),
        leg(player("Vet", 29, 11, 0.15, 2), "A", "B"),
      ]),
    );
    expect(scoresOf(result)).toEqual({ A: 99, B: 1 });
    expect(valid(result).teams.map((t) => t.verdict)).toEqual(["Win", "Loss"]);
  });

  it("3. two similar players -> 49 / 51, even trade", () => {
    const result = valid(
      scoreTrade(
        trade([["A", "middle"], ["B", "middle"]], [
          leg(player("P1", 26, 15, 0.15, 3), "A", "B"),
          leg(player("P2", 25, 14.5, 0.14, 3), "B", "A"),
        ]),
      ),
    );
    expect(scoresOf(result)).toEqual({ A: 49, B: 51 });
    expect(result.isEven).toBe(true);
    expect(result.winnerTeamId).toBeNull();
    expect(result.teams.every((t) => t.verdict === "Even")).toBe(true);
  });

  it("4. contender pays a lottery pick to dump a bad contract -> 25 / 85 (a bad contract is not worth a lottery pick)", () => {
    const result = valid(
      scoreTrade(
        trade([["A", "contender"], ["B", "rebuild"]], [
          leg(player("Old vet", 32, 9, 0.25, 2), "A", "B"),
          leg(pick("Lottery pick", { yearsUntilDraft: 0, projectedSlot: 7 }), "A", "B"),
          leg(player("Role player", 28, 11, 0.08, 1), "B", "A"),
        ]),
      ),
    );
    expect(scoresOf(result)).toEqual({ A: 25, B: 85 });
    expect(result.winnerTeamId).toBe("B");
  });
});

describe("Trade Score — common sense", () => {
  const gift = (asset: PlayerAsset) =>
    scoresOf(scoreTrade(trade([["giver", "contender"], ["taker", "rebuild"]], [leg(asset, "giver", "taker")])));

  it("giving away a star for nothing is a clear loss, and a win for the team receiving him", () => {
    const s = gift(player("Star", 27, 21, 0.3, 3));
    expect(s.giver).toBeLessThan(20);
    expect(s.taker).toBeGreaterThan(60);
  });

  it("giving away a minimum-salary bench player is about even", () => {
    const s = gift(player("Bench", 30, 4, 0.013, 1)); // Game Score 4 = no talent counted
    expect(Math.abs(s.giver - 50)).toBeLessThanOrEqual(2);
    expect(Math.abs(s.taker - 50)).toBeLessThanOrEqual(2);
  });

  it("a fairly paid role player is worth about nothing (not a big minus)", () => {
    // Game Score 12 is worth ~19% of the cap a year since the 2026-11-12 calibration.
    expect(Math.abs(playerValue(player("Role", 27, 12, 0.19, 2), "middle").value)).toBeLessThan(0.03);
  });
});

describe("Trade Score — edge cases", () => {
  it("a player below Game Score 4 has no talent: his value is only his cost (bad contracts count x0.3)", () => {
    const { value, breakdown } = playerValue(player("Deep bench", 28, 3, 0.05, 1), "middle");
    expect(breakdown.talentNow).toBe(0);
    expect(value).toBeCloseTo(0.3 * -0.7 * (0.05 - 0.013), 6);
  });

  it("a player with no contract left is worth 0", () => {
    const { value, breakdown } = playerValue(player("Expiring", 27, 18, 0.2, 0), "contender");
    expect(value).toBe(0);
    expect(breakdown.seasons).toBe(0);
  });

  it("a protected pick is worth 70% of the same unprotected pick", () => {
    const open = pickValue(pick("Open", { yearsUntilDraft: 2 }), "rebuild").value;
    const prot = pickValue(pick("Prot", { yearsUntilDraft: 2, protected: true }), "rebuild").value;
    expect(prot).toBeCloseTo(open * 0.7, 10);
  });

  it("an invalid trade gets no score, only the errors", () => {
    const result = scoreTrade({
      league: "NBA",
      salaryCap: 165_000_000,
      teams: [
        { id: "A", abbreviation: "AAA", mode: "middle", payroll: 180_000_000 },
        { id: "B", abbreviation: "BBB", mode: "middle", payroll: 120_000_000 },
      ],
      // AAA is over the cap and takes back 30% of the cap for 10% sent.
      legs: [leg(player("Small", 27, 10, 0.1, 1), "A", "B"), leg(player("Big", 27, 15, 0.3, 1), "B", "A")],
    });
    expect(result.valid).toBe(false);
    expect(result.teams).toEqual([]);
    if (!result.valid) expect(result.errors[0]).toContain("AAA would be over the cap");
  });

  it("scores a 3-team trade: every team gets a score and the asset details", () => {
    const result = valid(
      scoreTrade(
        trade([["A", "contender"], ["B", "middle"], ["C", "rebuild"]], [
          leg(player("Star", 27, 20, 0.25, 2), "C", "A"),
          leg(player("Young", 21, 12, 0.04, 3), "A", "C"),
          leg(pick("2nd", { round: 2, yearsUntilDraft: 1 }), "A", "B"),
          leg(player("Vet", 31, 11, 0.1, 1), "B", "C"),
        ]),
      ),
    );
    expect(result.teams).toHaveLength(3);
    const a = result.teams.find((t) => t.teamId === "A")!;
    expect(a.received.map((d) => d.label)).toEqual(["Star"]);
    expect(a.sent.map((d) => d.label)).toEqual(["Young", "2nd"]);
    expect(a.details.net).toBeCloseTo(a.details.receivedTotal - a.details.sentTotal, 10);
    expect(a.received[0].breakdown).toHaveProperty("talentNow");
  });
});

describe("Trade Score — reasons (Why X?)", () => {
  it("explains a lopsided trade with the asset that matters most first", () => {
    const result = valid(
      scoreTrade(
        trade([["A", "middle"], ["B", "middle"]], [
          leg(player("MVP", 26, 28, 0.32, 4), "B", "A"),
          leg({ ...player("Injured vet", 33, 18, 0.3, 2), availability: 0.5 }, "A", "B"),
        ]),
      ),
    );
    const b = result.teams.find((t) => t.teamId === "B")!;
    const reasons = reasonsFor(b);
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.length).toBeLessThanOrEqual(3);
    expect(reasons[0]).toContain("Gives up MVP");
  });

  it("says when nothing much happens", () => {
    const result = valid(scoreTrade(trade([["A", "middle"], ["B", "middle"]], [leg(player("Bench", 30, 6, 0.013, 1), "A", "B")])));
    expect(reasonsFor(result.teams[0])).toEqual(["Small move: nothing in this trade changes much for them."]);
  });
});

describe("Trade Score — building blocks", () => {
  it("talent matches the reference points (GmSc 12/15/20/25)", () => {
    expect(talent(12)).toBeCloseTo(0.125, 2);
    expect(talent(15)).toBeCloseTo(0.206, 2);
    expect(talent(20)).toBeCloseTo(0.369, 2);
    expect(talent(25)).toBeCloseTo(0.564, 2);
    expect(talent(3)).toBe(0);
  });

  it("age growth follows the table", () => {
    expect([22, 24, 27, 30, 31, 35].map(ageGrowth)).toEqual([0.08, 0.04, 0, -0.05, -0.1, -0.15]);
  });

  it("picks the team mode from the record", () => {
    expect(modeFromRecord(7, 1)).toBe("contender");
    expect(modeFromRecord(4, 4)).toBe("middle");
    expect(modeFromRecord(2, 6)).toBe("rebuild");
  });

  it("uses only last season when fewer than 10 games were played this season", () => {
    const line = (gp: number, pts: number) => ({ gp, pts, fgm: 0, fga: 0, ftm: 0, fta: 0, orb: 0, drb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0 });
    expect(blendGameScore(line(8, 30), line(82, 10), 8).gameScore).toBe(10);
    expect(blendGameScore(line(20, 30), line(82, 10), 20).gameScore).toBeCloseTo(0.6 * 30 + 0.4 * 10);
  });

  it("maps scores to tiers", () => {
    expect([1, 31, 50, 73, 92].map(tierFor)).toEqual(["Fleeced", "Lost It", "Fair Deal", "Won It", "Heist!"]);
  });

  it("maps scores to letter grades", () => {
    expect([1, 25, 45, 55, 65, 75, 85, 99].map(gradeFor)).toEqual(["F", "D", "C", "C+", "B", "B+", "A", "A+"]);
  });
});

describe("Trade Value (player /100)", () => {
  const p = (gameScore: number, salary: number, years: number, age = 26) => ({
    kind: "player" as const, id: "x", name: "x", age, gameScore, availability: 1, salaries: Array(years).fill(salary),
  });
  it("a star on a fair deal is well above 50, a bad contract below, a min bench player ~50", () => {
    expect(playerTradeValue(p(25, 0.3, 4)).score).toBeGreaterThan(75);
    expect(playerTradeValue(p(9, 0.25, 3)).score).toBeLessThan(40); // bad contracts count x0.3, so they rarely go very low
    expect(Math.abs(playerTradeValue(p(5, 0.013, 1)).score - 50)).toBeLessThanOrEqual(2);
  });
});
