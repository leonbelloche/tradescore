// Dev check: who has no contract, and the most valuable injured players. Run: npx tsx --env-file=.env.local scripts/missing-check.mts
import { getValuedPlayers } from "@/lib/players/values";
const { players } = await getValuedPlayers();
const missing = players.filter((p) => !p.hasContract).sort((a, b) => b.gameScore - a.gameScore);
console.log("missing", missing.length);
for (const p of missing.slice(0, 25)) console.log(`${p.name.padEnd(26)} ${p.team.abbreviation.padEnd(5)} age ${p.age} GmSc ${p.gameScore.toFixed(1)} avail ${p.availability.toFixed(2)} score ${p.score}`);
const gms = missing.map((p) => p.gameScore);
console.log("GmSc buckets: <5", gms.filter((g) => g < 5).length, "5-8", gms.filter((g) => g >= 5 && g < 8).length, "8-12", gms.filter((g) => g >= 8 && g < 12).length, ">=12", gms.filter((g) => g >= 12).length);
console.log("--- injured (avail<0.6, GmSc>=14)");
for (const p of players.filter((p) => p.availability < 0.6 && p.gameScore >= 14).slice(0, 15)) console.log(`${p.name.padEnd(26)} avail ${p.availability.toFixed(2)} GmSc ${p.gameScore.toFixed(1)} salary ${(p.salary / 1e6).toFixed(1)} score ${p.score}`);
