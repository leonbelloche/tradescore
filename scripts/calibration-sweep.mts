// Dev check: tries several formula settings (in memory only, nothing is saved) and reports, for each one,
// how many reference trades match the analysts and a few sanity numbers.
// Run: npx tsx --env-file=.env.local scripts/calibration-sweep.mts
import reference from "@/data/calibration_trades.json";
import { SCORE_CONFIG } from "@/lib/score/config";
import { getValuedPlayers } from "@/lib/players/values";
import { getScoredTrades } from "@/lib/trades/scored";

type Patch = Partial<Record<keyof typeof SCORE_CONFIG, unknown>>;
const base = structuredClone(SCORE_CONFIG) as Record<string, unknown>;
const cfg = SCORE_CONFIG as unknown as Record<string, unknown>;

const picks = (second: number, futureFirst: number) => ({ pickBase: { ...(base.pickBase as object), second, futureFirst } });
const best = (bad: number, floor: number, second: number, first: number, extra: Patch = {}) => ({
  name: `bad x${bad} floor ${floor} 2nd ${second} 1st ${first}${Object.keys(extra).length ? ` ${JSON.stringify(extra)}` : ""}`,
  patch: { negativeValueWeight: bad, gmscFloor: floor, ...picks(second, first), ...extra },
});
const fine = process.argv[2] === "fine";
const variants: { name: string; patch: Patch }[] = fine
  ? [
      best(0.3, 4, 0.02, 0.12),
      best(0.2, 4, 0.02, 0.12),
      best(0.4, 4, 0.02, 0.12),
      best(0.3, 3.5, 0.02, 0.12),
      best(0.3, 4.5, 0.02, 0.12),
      best(0.3, 4, 0.02, 0.1),
      best(0.3, 4, 0.02, 0.14),
      best(0.3, 4, 0.03, 0.12),
      best(0.3, 4, 0.01, 0.12),
      best(0.3, 4, 0.02, 0.12, { salaryWeight: 0.6 }),
      best(0.3, 4, 0.02, 0.12, { scoreScale: 0.2 }),
    ]
  : [
  { name: "today", patch: {} },
  { name: "bad contracts x0.5", patch: { negativeValueWeight: 0.5 } },
  { name: "bad contracts x0.3", patch: { negativeValueWeight: 0.3 } },
  { name: "bad contracts x0", patch: { negativeValueWeight: 0 } },
  { name: "bad x0.5 + floor 4", patch: { negativeValueWeight: 0.5, gmscFloor: 4 } },
  { name: "bad x0.3 + floor 4", patch: { negativeValueWeight: 0.3, gmscFloor: 4 } },
  { name: "bad x0.3 + 2nd .02 + 1st .12", patch: { negativeValueWeight: 0.3, ...picks(0.02, 0.12) } },
  { name: "bad x0.3 + floor 4 + 2nd .02 + 1st .12", patch: { negativeValueWeight: 0.3, gmscFloor: 4, ...picks(0.02, 0.12) } },
  { name: "bad x0 + floor 4 + 2nd .02 + 1st .12", patch: { negativeValueWeight: 0, gmscFloor: 4, ...picks(0.02, 0.12) } },
  { name: "2nd 0.02", patch: picks(0.02, 0.18) },
  { name: "2nd 0.01", patch: picks(0.01, 0.18) },
  { name: "2nd 0.02, future 1st 0.12", patch: picks(0.02, 0.12) },
  { name: "2nd 0.02, future 1st 0.08", patch: picks(0.02, 0.08) },
  { name: "floor 4 + 2nd 0.02", patch: { gmscFloor: 4, ...picks(0.02, 0.18) } },
  { name: "floor 4 + 2nd 0.02 + 1st 0.12", patch: { gmscFloor: 4, ...picks(0.02, 0.12) } },
  { name: "floor 4 + 2nd 0.01 + 1st 0.10", patch: { gmscFloor: 4, ...picks(0.01, 0.1) } },
  { name: "salary 0.5 + 2nd 0.02 + 1st 0.12", patch: { salaryWeight: 0.5, ...picks(0.02, 0.12) } },
  { name: "salary 0.5 + floor 4 + 2nd .02 + 1st .12", patch: { salaryWeight: 0.5, gmscFloor: 4, ...picks(0.02, 0.12) } },
  { name: "salary 0.4 + floor 4 + 2nd .01 + 1st .10", patch: { salaryWeight: 0.4, gmscFloor: 4, ...picks(0.01, 0.1) } },
];

for (const v of variants) {
  for (const [k, val] of Object.entries(base)) cfg[k] = structuredClone(val);
  Object.assign(cfg, v.patch);
  const trades = new Map((await getScoredTrades()).map((t) => [t.id, t]));
  let hits = 0;
  let leans = 0; // the team we score higher is the analysts' winner (or a close call when they say "even")
  const misses: string[] = [];
  for (const r of reference as { slug: string; analystWinner: string }[]) {
    const t = trades.get(r.slug);
    const predicted = t ? (t.winner ? t.winner.team.abbreviation : "even") : "missing";
    if (predicted.toLowerCase() === r.analystWinner.toLowerCase()) hits++;
    else misses.push(r.slug.slice(11, 40));
    if (t) {
      const sorted = [...t.teams].sort((a, b) => b.score - a.score);
      const gap = sorted[0].score - (sorted[1]?.score ?? 50);
      const lean = r.analystWinner.toLowerCase() === "even" ? gap < 15 : sorted[0].team.abbreviation.toLowerCase() === r.analystWinner.toLowerCase();
      if (lean) leans++;
    }
  }
  const { players } = await getValuedPlayers();
  const signed = players.filter((p) => p.hasContract && p.availability >= 0.6);
  const negative = signed.filter((p) => p.value < 0).length;
  const extremes = [...trades.values()].flatMap((t) => t.teams.map((x) => x.score)).filter((s) => s <= 10 || s >= 90).length;
  const top = signed.slice(0, 3).map((p) => `${p.name.split(" ").pop()} ${p.score}`).join(", ");
  console.log(`${v.name.padEnd(40)} ${hits}/15 (lean ${leans}/15) | negative values ${Math.round((negative / signed.length) * 100)}% | extreme grades ${extremes} | top: ${top}`);
}
