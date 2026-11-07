// STEP 3 — Replaces the database content with data/espn.json + data/contracts.csv + data/trades.json.
// Run: node scripts/import-db.mjs
// Needs SUPABASE_SECRET_KEY in .env.local (node scripts/set-secret.mjs).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, parseCsv, slugify } from "./lib.mjs";

const SEASONS = ["2026-27", "2027-28", "2028-29", "2029-30", "2030-31"];
// 2026-27 salary cap. TODO(Léon): confirm the official figure (2025-26 was $154,647,000).
const SALARY_CAP = 165_000_000;
const DATA = new URL("../data/", import.meta.url);
const read = (name) => readFileSync(new URL(name, DATA), "utf8");

loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("✕ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local (run: node scripts/set-secret.mjs)");
  process.exit(1);
}
const db = createClient(url, secret, { auth: { persistSession: false } });

async function run(label, promise) {
  const { error, data } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}
const chunks = (list, size = 200) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

const { teams, players, fetchedAt } = JSON.parse(read("espn.json"));
const contractRows = parseCsv(read("contracts.csv"));
const trades = JSON.parse(read("trades.json"));

// 1. Wipe old data (demo teams included). Order matters because of foreign keys.
for (const table of ["trades", "contracts", "players", "teams"]) {
  await run(`clear ${table}`, db.from(table).delete().not("id", "is", null));
}
console.log("✓ cleared old data");

// 2. League
await run(
  "league",
  db.from("leagues").upsert({
    id: "nba",
    name: "NBA",
    current_season: SEASONS[0],
    salary_cap: SALARY_CAP,
    rules_json: { salaryMatching: { maxIncomingRatio: 1.25, marginDollars: 250000 }, capGrowthPerYear: 0.07 },
  }),
);

// 3. Teams
const insertedTeams = await run(
  "teams",
  db
    .from("teams")
    .insert(teams.map((t) => ({ league_id: "nba", espn_id: t.espn_id, name: t.name, short_name: t.short_name, slug: t.slug, abbreviation: t.abbreviation, logo_url: t.logo_url, wins: t.wins, losses: t.losses })))
    .select("id, espn_id, abbreviation"),
);
const teamId = new Map(insertedTeams.map((t) => [t.espn_id, t.id]));
const teamIdByAbbr = new Map(insertedTeams.map((t) => [t.abbreviation, t.id]));
console.log(`✓ ${insertedTeams.length} teams`);

// 4. Players (slugs must be unique: add the ESPN id if two players share a name)
const seen = new Set();
const playerRows = players.map((p) => {
  const slug = seen.has(p.slug) ? `${p.slug}-${p.espn_id}` : p.slug;
  seen.add(slug);
  return { espn_id: p.espn_id, team_id: teamId.get(p.team_espn_id), name: p.name, slug, position: p.position, age: p.age, headshot_url: p.headshot_url, stats_json: p.stats };
});
const playerId = new Map();
for (const part of chunks(playerRows)) {
  const rows = await run("players", db.from("players").insert(part).select("id, espn_id"));
  rows.forEach((r) => playerId.set(r.espn_id, r.id));
}
console.log(`✓ ${playerId.size} players`);

// 5. Contracts (one row per season with a salary)
const contracts = contractRows.flatMap((r) =>
  SEASONS.filter((s) => r[s] && Number(r[s]) > 0 && playerId.has(r.espn_id)).map((s) => ({
    player_id: playerId.get(r.espn_id),
    season: s,
    salary: Math.round(Number(r[s])),
    source: r.source === "manual" ? "manual" : "espn",
  })),
);
for (const part of chunks(contracts, 500)) await run("contracts", db.from("contracts").insert(part));
console.log(`✓ ${contracts.length} contract rows (${contractRows.filter((r) => r.source === "missing").length} players still missing a contract)`);

// 6. Trades: players resolved by name -> ESPN id. Unknown players are kept with espn_id = null.
const espnIdBySlug = new Map(players.map((p) => [p.slug, p.espn_id]));
const tradeRows = trades.map((t) => {
  const abbrs = [...new Set(t.assets.flatMap((a) => [a.from, a.to]))];
  for (const a of abbrs) if (!teamIdByAbbr.has(a)) throw new Error(`Trade ${t.slug}: unknown team ${a}`);
  return {
    slug: t.slug,
    trade_date: t.date,
    source_text: t.source.join("\n"),
    teams_json: abbrs,
    assets_json: t.assets.map((a) => (a.name ? { ...a, espn_id: espnIdBySlug.get(slugify(a.name)) ?? null } : a)),
  };
});
await run("trades", db.from("trades").insert(tradeRows));
console.log(`✓ ${tradeRows.length} trades`);
console.log(`Done. ESPN data fetched at ${fetchedAt}.`);
