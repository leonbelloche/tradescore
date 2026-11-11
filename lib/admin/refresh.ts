// Daily data refresh from ESPN (runs every morning via Vercel Cron, or from the admin "Refresh now" button).
// Updates: team records, rosters (trades, signings, waived players), per-game stats, and ESPN contracts
// for players who have none. NEVER touches contracts you typed yourself (source = manual) or the trades table.
import { adminDb, must } from "@/lib/db/admin";
import type { League, SeasonStats } from "@/lib/db/types";
import { previousSeason } from "@/lib/trades/assets";

const SITE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
const SEASONS_AHEAD = 5;

export type RefreshSummary = {
  at: string;
  teams: number;
  players: number;
  newPlayers: string[];
  moved: string[]; // "Name: OLD → NEW"
  released: number; // players no longer on a roster
  contractsAdded: number;
  seconds: number;
};

async function getJson<T>(url: string): Promise<T | null> {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
      if (res.status === 404) return null;
      if (res.ok) return (await res.json()) as T;
    } catch {}
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  return null;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const chunks = <T,>(list: T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

function parseSeason(labels: string[], stats: string[]): SeasonStats {
  const v = (label: string) => stats[labels.indexOf(label)];
  const madeAtt = (label: string) => (v(label) ?? "0-0").split("-").map(Number);
  const num = (label: string) => Number(v(label) ?? 0);
  const [fgm, fga] = madeAtt("FG");
  const [ftm, fta] = madeAtt("FT");
  return { gp: num("GP"), min: num("MIN"), pts: num("PTS"), fgm, fga, ftm, fta, orb: num("OR"), drb: num("DR"), ast: num("AST"), stl: num("STL"), blk: num("BLK"), tov: num("TO"), pf: num("PF") };
}

type EspnAthlete = { id: string; displayName: string; age?: number; position?: { abbreviation?: string }; headshot?: { href?: string } };
type StatsRes = { categories?: { name: string; labels: string[]; statistics: { season: { displayName: string }; teamId?: string; stats: string[] }[] }[] };

export async function refreshData(): Promise<RefreshSummary> {
  const started = Date.now();
  const db = adminDb();
  const league = await must<League>("league", db.from("leagues").select("*").eq("id", "nba").single());
  const current = league.current_season;
  const previous = previousSeason(current);
  const espnYear = Number(current.slice(0, 4)) + 1; // ESPN names a season by the year it ends
  const seasons = Array.from({ length: SEASONS_AHEAD }, (_, i) => {
    const y = Number(current.slice(0, 4)) + i;
    return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
  });

  // 1. Records
  const teams = await must<{ id: string; espn_id: string | null; abbreviation: string }[]>("teams", db.from("teams").select("id, espn_id, abbreviation"));
  const standings = await getJson<{ children: { standings: { entries: { team: { id: string }; stats: { name: string; value: number }[] }[] } }[] }>(
    "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings",
  );
  if (!standings) throw new Error("ESPN standings are unavailable right now. Try again later.");
  const records = standings.children.flatMap((c) => c.standings.entries);
  await Promise.all(
    records.map((e) => {
      const stat = (name: string) => e.stats.find((s) => s.name === name)?.value ?? 0;
      return must("record", db.from("teams").update({ wins: stat("wins"), losses: stat("losses") }).eq("espn_id", e.team.id));
    }),
  );

  // 2. Rosters
  const rosters = await mapLimit(teams, 6, async (t) => ({ team: t, res: t.espn_id ? await getJson<{ athletes: EspnAthlete[] }>(`${SITE}/teams/${t.espn_id}/roster`) : null }));
  if (rosters.some((r) => !r.res)) throw new Error("Some ESPN rosters could not be loaded. Nothing was changed except team records. Try again later.");

  const existing = await must<{ id: string; espn_id: string | null; slug: string; name: string; team_id: string | null }[]>(
    "players",
    db.from("players").select("id, espn_id, slug, name, team_id"),
  );
  const byEspn = new Map(existing.filter((p) => p.espn_id).map((p) => [p.espn_id!, p]));
  const usedSlugs = new Set(existing.map((p) => p.slug));
  const abbrOf = new Map(teams.map((t) => [t.id, t.abbreviation]));

  const rostered = rosters.flatMap(({ team, res }) => res!.athletes.map((a) => ({ a, teamId: team.id })));
  const summary: RefreshSummary = { at: new Date().toISOString(), teams: records.length, players: rostered.length, newPlayers: [], moved: [], released: 0, contractsAdded: 0, seconds: 0 };

  // 3. Stats (current + previous season), ~500 requests
  const stats = await mapLimit(rostered, 10, async ({ a }) => {
    const s = await getJson<StatsRes>(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${a.id}/stats`);
    const avg = s?.categories?.find((c) => c.name === "averages");
    const out: Record<string, SeasonStats> = {};
    if (avg) {
      for (const season of [previous, current]) {
        const rows = avg.statistics.filter((r) => r.season.displayName === season);
        const row = rows.find((r) => !r.teamId) ?? rows[rows.length - 1]; // traded mid-season: "Totals" row
        if (row) out[season] = parseSeason(avg.labels, row.stats);
      }
    }
    return s ? out : null; // null = ESPN failed: keep the old stats
  });

  const rows = rostered.map(({ a, teamId }, i) => {
    const old = byEspn.get(a.id);
    let slug = old?.slug;
    if (!slug) {
      slug = usedSlugs.has(slugify(a.displayName)) ? `${slugify(a.displayName)}-${a.id}` : slugify(a.displayName);
      usedSlugs.add(slug);
      summary.newPlayers.push(`${a.displayName} (${abbrOf.get(teamId)})`);
    } else if (old && old.team_id !== teamId) {
      summary.moved.push(`${a.displayName}: ${old.team_id ? abbrOf.get(old.team_id) : "FA"} → ${abbrOf.get(teamId)}`);
    }
    return {
      espn_id: a.id,
      team_id: teamId,
      name: a.displayName,
      slug,
      position: a.position?.abbreviation ?? "",
      age: a.age ?? 0,
      headshot_url: a.headshot?.href ?? null,
      ...(stats[i] ? { stats_json: stats[i] } : {}),
    };
  });
  // Players with and without fresh stats go in separate batches (an upsert batch must share the same columns).
  for (const part of chunks(rows.filter((r) => "stats_json" in r), 200)) await must("players", db.from("players").upsert(part, { onConflict: "espn_id" }));
  for (const part of chunks(rows.filter((r) => !("stats_json" in r)), 200)) await must("players", db.from("players").upsert(part, { onConflict: "espn_id" }));

  // Players no longer on any roster become free agents (their trades still show, with a warning).
  const onRoster = new Set(rostered.map((r) => r.a.id));
  const gone = existing.filter((p) => p.team_id && p.espn_id && !onRoster.has(p.espn_id)).map((p) => p.id);
  for (const part of chunks(gone, 200)) await must("released", db.from("players").update({ team_id: null }).in("id", part));
  summary.released = gone.length;

  // 4. ESPN contracts for players who have none at all (your manual rows are never touched).
  const all = await must<{ id: string; espn_id: string | null; contracts: { season: string }[] }[]>("contracts", db.from("players").select("id, espn_id, contracts(season)").not("team_id", "is", null));
  const without = all.filter((p) => p.espn_id && p.contracts.length === 0);
  const found = await mapLimit(without, 8, async (p) => ({
    p,
    c: await getJson<{ salary?: number; yearsRemaining?: number }>(`https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/athletes/${p.espn_id}/contracts/${espnYear}`),
  }));
  const contractRows = found
    .filter(({ c }) => c?.salary && c.salary > 0)
    .flatMap(({ p, c }) => seasons.slice(0, Math.max(1, Math.min(SEASONS_AHEAD, c!.yearsRemaining || 1))).map((season) => ({ player_id: p.id, season, salary: Math.round(c!.salary!), source: "espn" })));
  for (const part of chunks(contractRows, 500)) await must("contracts", db.from("contracts").upsert(part, { onConflict: "player_id,season", ignoreDuplicates: true }));
  summary.contractsAdded = new Set(contractRows.map((r) => r.player_id)).size;

  summary.seconds = Math.round((Date.now() - started) / 1000);
  await saveSite({ lastRefresh: summary.at, lastRefreshSummary: summary });
  return summary;
}

// Site settings live in leagues.rules_json.site (no extra table needed).
export type SiteSettings = {
  lastRefresh?: string;
  lastRefreshSummary?: RefreshSummary;
  lastRefreshError?: { at: string; message: string };
  refreshStartedAt?: string; // automatic refresh in progress (see autoRefresh.ts)
  tradeOfTheWeek?: string | null; // trade slug chosen by the admin, null = automatic
};

export async function saveSite(patch: Partial<SiteSettings>) {
  const db = adminDb();
  const league = await must<League>("league", db.from("leagues").select("rules_json").eq("id", "nba").single());
  const site = { ...((league.rules_json.site ?? {}) as SiteSettings), ...patch };
  await must("settings", db.from("leagues").update({ rules_json: { ...league.rules_json, site } }).eq("id", "nba"));
}
