// Dev check: same winner as the analysts? Run: npx tsx --env-file=.env.local scripts/calibration-check.mts
import reference from "@/data/calibration_trades.json";
import { getScoredTrades } from "@/lib/trades/scored";
const trades = new Map((await getScoredTrades()).map((t) => [t.id, t]));
let hits = 0;
for (const r of reference as { slug: string; analystWinner: string }[]) {
  const t = trades.get(r.slug);
  const predicted = t ? (t.winner ? t.winner.team.abbreviation : "even") : "missing";
  const hit = predicted.toLowerCase() === r.analystWinner.toLowerCase();
  if (hit) hits++;
  console.log(`${hit ? "OK " : "XX "} ${r.slug.padEnd(48)} us ${predicted.padEnd(6)} analysts ${r.analystWinner.padEnd(6)} ${t ? t.teams.map((x) => `${x.team.abbreviation} ${x.score}`).join(" / ") : ""}`);
}
console.log(`${hits}/${(reference as unknown[]).length}`);
