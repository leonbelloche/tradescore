// Dev check: for each reference trade, the value of every asset as each team sees it.
// Run: npx tsx --env-file=.env.local scripts/calibration-detail.mts [only-misses]
import reference from "@/data/calibration_trades.json";
import { getScoredTrades } from "@/lib/trades/scored";

const onlyMisses = process.argv[2] === "only-misses";
const trades = new Map((await getScoredTrades()).map((t) => [t.id, t]));
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
for (const r of reference as { slug: string; analystWinner: string; source?: string }[]) {
  const t = trades.get(r.slug);
  if (!t) continue;
  const predicted = t.winner ? t.winner.team.abbreviation : "even";
  const hit = predicted.toLowerCase() === r.analystWinner.toLowerCase();
  if (onlyMisses && hit) continue;
  console.log(`\n${hit ? "OK" : "XX"} ${r.slug} | us ${predicted} | analysts ${r.analystWinner}`);
  for (const side of t.teams) {
    const res = side.result;
    console.log(`  ${side.team.abbreviation} ${side.score} (${res.mode}) net ${pct(res.details.net ?? 0)}`);
    for (const d of res.received) console.log(`     + ${d.label.padEnd(34)} ${pct(d.value)}  ${d.breakdown.gameScore !== undefined ? `GmSc ${d.breakdown.gameScore.toFixed(1)} avail ${d.breakdown.availability?.toFixed(2)}` : ""}`);
    for (const d of res.sent) console.log(`     - ${d.label.padEnd(34)} ${pct(d.value)}`);
  }
}
