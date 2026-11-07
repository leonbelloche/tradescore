// Calibration: does the Trade Score pick the same winner as the analysts?
// Run: npm run calibrate
//
// Reads data/calibration_trades.json (see data/calibration_trades.example.json):
//   [{ "slug": "<trade slug from data/trades.json>", "analystWinner": "PHI" | "even", "source": "where the verdict comes from" }]
// Goal: at least 15 correct winners out of 20.
import { existsSync, readFileSync } from "node:fs";
import { getScoredTrades } from "@/lib/trades/scored";

type CalibrationTrade = { slug: string; analystWinner: string; source?: string };

const FILE = new URL("../../data/calibration_trades.json", import.meta.url);
if (!existsSync(FILE)) {
  console.error("✕ data/calibration_trades.json is missing. Copy data/calibration_trades.example.json and fill in the analyst verdicts.");
  process.exit(1);
}
const expected: CalibrationTrade[] = JSON.parse(readFileSync(FILE, "utf8"));
const trades = new Map((await getScoredTrades()).map((t) => [t.id, t]));

let ok = 0;
const rows = expected.map((e) => {
  const t = trades.get(e.slug);
  if (!t) return { trade: e.slug, scores: "NOT FOUND", predicted: "-", analysts: e.analystWinner, result: "KO" };
  const predicted = t.winner ? t.winner.team.abbreviation : "even";
  const hit = predicted.toLowerCase() === e.analystWinner.toLowerCase();
  if (hit) ok++;
  return {
    trade: e.slug,
    scores: t.teams.map((x) => `${x.team.abbreviation} ${x.score}`).join(" / "),
    predicted,
    analysts: e.analystWinner,
    result: hit ? "OK" : "KO",
  };
});

console.table(rows);
console.log(`\n${ok}/${expected.length} correct winners (goal: 15/20).`);
process.exit(0);
