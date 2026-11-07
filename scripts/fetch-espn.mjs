// STEP 1 — Downloads teams, standings, rosters, stats and contracts from ESPN
// into data/espn.json.
// Run: node scripts/fetch-espn.mjs      (takes ~2 minutes, ~1000 requests)
//
// ESPN endpoints used here are public but unofficial: they may change without notice.
import { mkdirSync, writeFileSync } from "node:fs";
import { getJson, mapLimit, slugify } from "./lib.mjs";

const SEASONS = ["2026-27", "2027-28", "2028-29", "2029-30", "2030-31"];
const CURRENT = SEASONS[0];
const PREVIOUS = "2025-26";
const ESPN_YEAR = 2027; // ESPN names a season by the year it ends
const SITE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
const DATA = new URL("../data/", import.meta.url);
mkdirSync(DATA, { recursive: true });

// --- teams + standings ---
const teamsRes = await getJson(`${SITE}/teams`);
const espnTeams = teamsRes.sports[0].leagues[0].teams.map(({ team }) => team);

const standings = await getJson("https://site.api.espn.com/apis/v2/sports/basketball/nba/standings");
const record = new Map();
for (const conf of standings.children) {
  for (const e of conf.standings.entries) {
    const stat = (name) => e.stats.find((s) => s.name === name)?.value ?? 0;
    record.set(e.team.id, { wins: stat("wins"), losses: stat("losses") });
  }
}

const teams = espnTeams.map((t) => ({
  espn_id: t.id,
  name: t.displayName,
  short_name: t.name,
  slug: slugify(t.displayName),
  abbreviation: t.abbreviation,
  logo_url: t.logos?.[0]?.href ?? null,
  ...(record.get(t.id) ?? { wins: 0, losses: 0 }),
}));
console.log(`✓ ${teams.length} teams`);

// --- rosters ---
const rosters = await mapLimit(teams, 6, (t) => getJson(`${SITE}/teams/${t.espn_id}/roster`));
const players = rosters.flatMap((r, i) =>
  r.athletes.map((a) => ({
    espn_id: a.id,
    team_espn_id: teams[i].espn_id,
    name: a.displayName,
    slug: slugify(a.displayName),
    position: a.position?.abbreviation ?? "",
    age: a.age ?? 0,
    headshot_url: a.headshot?.href ?? null,
  })),
);
console.log(`✓ ${players.length} players`);

// --- stats: per-game averages for the current and previous seasons ---
// ESPN label -> our field. "FG" / "FT" come as "made-attempted".
function parseSeason(labels, stats) {
  const v = (label) => stats[labels.indexOf(label)];
  const madeAtt = (label) => (v(label) ?? "0-0").split("-").map(Number);
  const num = (label) => Number(v(label) ?? 0);
  const [fgm, fga] = madeAtt("FG");
  const [ftm, fta] = madeAtt("FT");
  return {
    gp: num("GP"), min: num("MIN"), pts: num("PTS"), fgm, fga, ftm, fta,
    orb: num("OR"), drb: num("DR"), ast: num("AST"), stl: num("STL"), blk: num("BLK"), tov: num("TO"), pf: num("PF"),
  };
}

let done = 0;
await mapLimit(players, 8, async (p) => {
  const s = await getJson(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${p.espn_id}/stats`);
  const avg = s?.categories?.find((c) => c.name === "averages");
  p.stats = {};
  if (avg) {
    for (const season of [PREVIOUS, CURRENT]) {
      const rows = avg.statistics.filter((r) => r.season.displayName === season);
      // Traded mid-season: ESPN adds a "Totals" row (no teamId) — use it.
      const row = rows.find((r) => !r.teamId) ?? rows[rows.length - 1];
      if (row) p.stats[season] = parseSeason(avg.labels, row.stats);
    }
  }
  // Contract for the current season (only ~half of players have one at ESPN).
  const c = await getJson(`https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/athletes/${p.espn_id}/contracts/${ESPN_YEAR}`);
  p.espnContract = c ? { salary: c.salary, yearsRemaining: c.yearsRemaining } : null;
  if (++done % 100 === 0) console.log(`  … ${done}/${players.length} players`);
});
console.log("✓ stats and ESPN contracts");

writeFileSync(new URL("espn.json", DATA), JSON.stringify({ fetchedAt: new Date().toISOString(), teams, players }, null, 1));
console.log("✓ wrote data/espn.json");

console.log("Next: node scripts/build-contracts.mjs");
