// "Trade ideas of the day": realistic deals built from real rosters and scored by the engine.
// A losing team sells a good veteran to a winning team for salary filler + a future 1st.
// The day's date seeds the random choices, so the ideas change every day but stay the same all day.
import type { TeamWithRoster } from "@/lib/db/teams";
import type { League } from "@/lib/db/types";
import { modeFromRecord, scoreTrade, type TeamResult, type TradeLeg } from "@/lib/score";
import type { ValuedPlayer } from "@/lib/players/values";
import { toPlayerAsset } from "./assets";

export type TradeIdea = {
  id: string;
  buyer: TeamWithRoster;
  seller: TeamWithRoster;
  target: ValuedPlayer;
  buyerResult: TeamResult;
  sellerResult: TeamResult;
};

// Small deterministic random generator (mulberry32) seeded from a string.
function rng(seed: string) {
  let a = [...seed].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761), 1779033703) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(list: T[], rand: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
const pct = (t: { wins: number; losses: number }) => (t.wins + t.losses ? t.wins / (t.wins + t.losses) : 0.5);

// Up to 3 buyer players whose salaries add up to 80-125% of the target's (cheapest-value players first).
function salaryPackage(pool: ValuedPlayer[], salary: number): ValuedPlayer[] | null {
  const fits = (list: ValuedPlayer[]) => {
    const total = list.reduce((s, p) => s + p.salary, 0);
    return total >= salary * 0.8 && total <= salary * 1.25;
  };
  for (const a of pool) if (fits([a])) return [a];
  for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) if (fits([pool[i], pool[j]])) return [pool[i], pool[j]];
  for (let i = 0; i < pool.length; i++)
    for (let j = i + 1; j < pool.length; j++)
      for (let k = j + 1; k < pool.length; k++) if (fits([pool[i], pool[j], pool[k]])) return [pool[i], pool[j], pool[k]];
  return null;
}

export function tradeIdeas(day: string, league: League, teams: TeamWithRoster[], players: ValuedPlayer[], count = 3): TradeIdea[] {
  const rand = rng(day);
  const byTeam = new Map(teams.map((t) => [t.id, t]));
  const sellers = new Set(teams.filter((t) => pct(t) < 0.5).map((t) => t.id));
  const buyers = shuffle(teams.filter((t) => pct(t) >= 0.55), rand);
  const targets = shuffle(
    players.filter((p) => sellers.has(p.team.id) && p.hasContract && p.score >= 62 && p.age >= 24 && p.salary >= 8_000_000),
    rand,
  );

  const ideas: TradeIdea[] = [];
  const used = new Set<string>();
  for (const target of targets) {
    if (ideas.length >= count) break;
    const seller = byTeam.get(target.team.id)!;
    if (used.has(seller.id)) continue;
    for (const buyer of buyers) {
      if (used.has(buyer.id)) continue;
      // Keep the buyer's 2 best players; trade away the rest, least valuable first.
      const mine = players.filter((p) => p.team.id === buyer.id && p.hasContract);
      const pool = mine.slice(2).sort((a, b) => a.score - b.score);
      const pkg = salaryPackage(pool, target.salary);
      if (!pkg) continue;

      const raw = (p: ValuedPlayer, team: TeamWithRoster) => toPlayerAsset(team.roster.find((r) => r.id === p.id)!, team, league);
      const legs: TradeLeg[] = [
        { asset: raw(target, seller), fromTeamId: seller.id, toTeamId: buyer.id },
        ...pkg.map((p) => ({ asset: raw(p, buyer), fromTeamId: buyer.id, toTeamId: seller.id })),
        {
          asset: { kind: "pick", id: `${day}-${buyer.abbreviation}-1st`, name: `Future 1st · ${buyer.abbreviation}`, round: 1, yearsUntilDraft: 2 },
          fromTeamId: buyer.id,
          toTeamId: seller.id,
        },
      ];
      const result = scoreTrade({
        league: "NBA",
        salaryCap: league.salary_cap,
        rules: league.rules_json,
        teams: [buyer, seller].map((t) => ({ id: t.id, abbreviation: t.abbreviation, mode: modeFromRecord(t.wins, t.losses), payroll: t.payroll })),
        legs,
      });
      if (!result.valid) continue;
      const buyerResult = result.teams.find((r) => r.teamId === buyer.id)!;
      const sellerResult = result.teams.find((r) => r.teamId === seller.id)!;
      ideas.push({ id: `${day}-${buyer.abbreviation}-${seller.abbreviation}`, buyer, seller, target, buyerResult, sellerResult });
      used.add(buyer.id).add(seller.id);
      break;
    }
  }
  return ideas;
}
