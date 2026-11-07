// Lists every ESPN transaction that mentions a trade since `SINCE`, grouped by day,
// into data/espn-trade-lines.txt. A human (or Claude) then writes data/trades.json from it:
// ESPN only gives sentences, and picks are often just "draft considerations".
// Run: node scripts/list-espn-trades.mjs
import { writeFileSync } from "node:fs";
import { getJson } from "./lib.mjs";

const SINCE = "2026-06-20"; // just before the 2026 draft
const URL_ = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/transactions";

const first = await getJson(`${URL_}?limit=100&page=1`);
let all = first.transactions;
for (let page = 2; page <= first.pageCount; page++) {
  all = all.concat((await getJson(`${URL_}?limit=100&page=${page}`)).transactions);
}

const lines = all
  .filter((t) => t.date.slice(0, 10) >= SINCE && /acquired|traded|trade/i.test(t.description))
  .sort((a, b) => a.date.localeCompare(b.date))
  .map((t) => `${t.date.slice(0, 10)} | ${t.team.abbreviation.padEnd(4)} | ${t.description}`);

writeFileSync(new URL("../data/espn-trade-lines.txt", import.meta.url), lines.join("\n") + "\n");
console.log(`✓ ${lines.length} trade lines since ${SINCE} → data/espn-trade-lines.txt`);
