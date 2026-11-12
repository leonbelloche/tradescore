// Dev helper: our numbers for some players and the trades they were in.
// Run: npx tsx --env-file=.env.local scripts/lookup.mts "Jaylen Brown" "Myles Turner"
import { getValuedPlayers } from "@/lib/players/values";
import { getScoredTrades } from "@/lib/trades/scored";

const names = process.argv.slice(2);
const { players } = await getValuedPlayers();
const trades = await getScoredTrades();
for (const n of names) {
  const p = players.find((x) => x.name.toLowerCase().includes(n.toLowerCase()));
  if (!p) {
    console.log(`${n}: not found`);
    continue;
  }
  console.log(
    `${p.name} | ${p.team.abbreviation} | age ${p.age} | $${(p.salary / 1e6).toFixed(1)}M x ${p.yearsLeft} (total $${(p.totalRemaining / 1e6).toFixed(1)}M) | GmSc ${p.gameScore.toFixed(1)} | avail ${p.availability.toFixed(2)} | TV ${p.score} (contender ${p.byMode.contender}, rebuild ${p.byMode.rebuild}) | contract ${p.hasContract ? "known" : "unknown"}`,
  );
  for (const t of trades.filter((x) => x.teams.some((s) => s.receives.some((r) => r.includes(p.name))))) {
    console.log(`   trade ${t.id}: ${t.teams.map((x) => `${x.team.short_name} ${x.score} (${x.tier}) gets ${x.receives.join(", ")}`).join(" | ")}`);
  }
}
