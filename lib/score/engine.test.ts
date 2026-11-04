import { describe, expect, it } from "vitest";
import {
  ageGrowth,
  blendGameScore,
  modeFromRecord,
  scoreTrade,
  talent,
  tierFor,
  type PickAsset,
  type PlayerAsset,
} from "./engine";

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
const scoresOf = (result: ReturnType<typeof scoreTrade>) =>
  Object.fromEntries(result.teams.map((t) => [t.teamId, t.score]));

describe("Trade Score — required trades from CLAUDE.md", () => {
  it("1. contender gets an All-Star, rebuild gets a young player + future 1st -> 54 / 92", () => {
    const result = scoreTrade({
      teams: [{ id: "A", mode: "contender" }, { id: "B", mode: "rebuild" }],
      moves: [
        { asset: player("All-Star", 27, 21, 0.3, 3), from: "B", to: "A" },
        { asset: player("Young", 22, 13, 0.06, 2), from: "A", to: "B" },
        { asset: pick("Future 1st", { yearsUntilDraft: 1 }), from: "A", to: "B" },
      ],
    });
    expect(scoresOf(result)).toEqual({ A: 54, B: 92 });
  });

  it("2. middle team gets an MVP for a declining player -> 100 / 0", () => {
    const result = scoreTrade({
      teams: [{ id: "A", mode: "middle" }, { id: "B", mode: "middle" }],
      moves: [
        { asset: player("MVP", 26, 28, 0.32, 4), from: "B", to: "A" },
        { asset: player("Vet", 29, 11, 0.15, 2), from: "A", to: "B" },
      ],
    });
    expect(scoresOf(result)).toEqual({ A: 100, B: 0 });
  });

  it("3. two similar players -> 50 / 50, even trade", () => {
    const result = scoreTrade({
      teams: [{ id: "A", mode: "middle" }, { id: "B", mode: "middle" }],
      moves: [
        { asset: player("P1", 26, 15, 0.15, 3), from: "A", to: "B" },
        { asset: player("P2", 25, 14.5, 0.14, 3), from: "B", to: "A" },
      ],
    });
    expect(scoresOf(result)).toEqual({ A: 50, B: 50 });
    expect(result.isEven).toBe(true);
    expect(result.winnerTeamId).toBeNull();
  });

  it("4. contender dumps a vet + this year's 4-10 pick to a rebuild team -> 73 / 31", () => {
    const result = scoreTrade({
      teams: [{ id: "A", mode: "contender" }, { id: "B", mode: "rebuild" }],
      moves: [
        { asset: player("Old vet", 32, 9, 0.25, 2), from: "A", to: "B" },
        { asset: pick("Lottery pick", { yearsUntilDraft: 0, projectedSlot: 7 }), from: "A", to: "B" },
        { asset: player("Role player", 28, 11, 0.08, 1), from: "B", to: "A" },
      ],
    });
    expect(scoresOf(result)).toEqual({ A: 73, B: 31 });
    expect(result.winnerTeamId).toBe("A");
  });
});

describe("Trade Score — building blocks", () => {
  it("talent matches the reference points (GmSc 12/15/20/25)", () => {
    expect(talent(12)).toBeCloseTo(0.08, 2);
    expect(talent(15)).toBeCloseTo(0.15, 2);
    expect(talent(20)).toBeCloseTo(0.3, 2);
    expect(talent(25)).toBeCloseTo(0.48, 2);
    expect(talent(5)).toBe(0); // below the floor
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
    expect([0, 31, 50, 73, 92].map(tierFor)).toEqual(["Fleeced", "Lost It", "Fair Deal", "Won It", "Heist!"]);
  });
});
