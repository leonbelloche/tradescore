// STEP 2 — Builds data/contracts.csv from data/espn.json (+ your manual rows).
// Run: node scripts/build-contracts.mjs      (instant, re-run it after every manual edit)
//
// How to fill a missing contract:
//   1. find the row (source = missing; players from real trades are listed first, in_trade = yes)
//   2. type the salary in dollars for each remaining season (e.g. 21500000), leave later seasons empty
//   3. change source to manual   -> your row is kept forever, ESPN never overwrites it
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseCsv, slugify, toCsv } from "./lib.mjs";

export const SEASONS = ["2026-27", "2027-28", "2028-29", "2029-30", "2030-31"];
const DATA = new URL("../data/", import.meta.url);
const CSV = new URL("contracts.csv", DATA);

const { teams, players } = JSON.parse(readFileSync(new URL("espn.json", DATA), "utf8"));
const trades = existsSync(new URL("trades.json", DATA)) ? JSON.parse(readFileSync(new URL("trades.json", DATA), "utf8")) : [];
const inTrades = new Set(trades.flatMap((t) => t.assets.filter((a) => a.name).map((a) => slugify(a.name))));

const manual = new Map(
  (existsSync(CSV) ? parseCsv(readFileSync(CSV, "utf8")) : []).filter((r) => r.source === "manual").map((r) => [r.espn_id, r]),
);
const teamAbbr = new Map(teams.map((t) => [t.espn_id, t.abbreviation]));

const rows = players.map((p) => {
  const base = { espn_id: p.espn_id, player: p.name, team: teamAbbr.get(p.team_espn_id), in_trade: inTrades.has(p.slug) ? "yes" : "" };
  if (manual.has(p.espn_id)) return { ...manual.get(p.espn_id), ...base, source: "manual" };
  if (p.espnContract) {
    const years = Math.max(1, Math.min(SEASONS.length, p.espnContract.yearsRemaining || 1));
    const row = { ...base, source: "espn", note: years > 1 ? "future years = current salary (estimate)" : "" };
    SEASONS.slice(0, years).forEach((s) => (row[s] = p.espnContract.salary));
    return row;
  }
  return { ...base, source: "missing", note: "fill salaries in dollars, then set source to manual" };
});

const order = { missing: 0, espn: 1, manual: 2 };
rows.sort(
  (a, b) => (b.in_trade === "yes") - (a.in_trade === "yes") || order[a.source] - order[b.source] || a.team.localeCompare(b.team),
);
writeFileSync(CSV, toCsv(rows, ["espn_id", "player", "team", "in_trade", "source", ...SEASONS, "note"]));

const count = (s) => rows.filter((r) => r.source === s).length;
const missingInTrades = rows.filter((r) => r.source === "missing" && r.in_trade);
console.log(`✓ data/contracts.csv — manual ${count("manual")}, espn ${count("espn")}, missing ${count("missing")}`);
console.log(`  Missing AND in a real trade (fill these first): ${missingInTrades.length}`);
for (const r of missingInTrades) console.log(`   - ${r.player} (${r.team})`);

// Trade players that are not on any roster (waived, unsigned, overseas...).
const known = new Set(players.map((p) => p.slug));
const unknown = [...inTrades].filter((s) => !known.has(s));
if (unknown.length) console.log(`  Trade players not on any current roster: ${unknown.join(", ")}`);
