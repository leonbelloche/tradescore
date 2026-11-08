// Every NBA player with his Trade Value /100 (see playerTradeValue in lib/score).
import { getLeagueWithRosters, type RosterPlayer, type TeamWithRoster } from "@/lib/db/teams";
import type { League } from "@/lib/db/types";
import { modeFromRecord, playerTradeValue, type TeamMode } from "@/lib/score";
import { toPlayerAsset } from "@/lib/trades/assets";

export type ValuedPlayer = {
  id: string;
  slug: string;
  name: string;
  position: string;
  age: number;
  headshotUrl: string | null;
  team: Pick<TeamWithRoster, "id" | "name" | "short_name" | "slug" | "abbreviation" | "logo_url">;
  salary: number; // current season, dollars (0 = contract unknown)
  yearsLeft: number;
  totalRemaining: number;
  gameScore: number; // blended Game Score
  availability: number; // 0..1
  value: number; // net value in fractions of the cap (middle team)
  score: number; // Trade Value /100 (middle team)
  byMode: Record<TeamMode, number>; // Trade Value /100 for each kind of team
  hasContract: boolean;
};

export function valuePlayer(p: RosterPlayer, team: TeamWithRoster, league: League): ValuedPlayer {
  const asset = toPlayerAsset(p, team, league);
  const middle = playerTradeValue(asset, "middle");
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    position: p.position,
    age: p.age,
    headshotUrl: p.headshot_url,
    team: { id: team.id, name: team.name, short_name: team.short_name, slug: team.slug, abbreviation: team.abbreviation, logo_url: team.logo_url },
    salary: p.currentSalary,
    yearsLeft: p.yearsLeft,
    totalRemaining: p.totalRemaining,
    gameScore: asset.gameScore,
    availability: asset.availability,
    value: middle.value,
    score: middle.score,
    byMode: {
      contender: playerTradeValue(asset, "contender").score,
      middle: middle.score,
      rebuild: playerTradeValue(asset, "rebuild").score,
    },
    hasContract: p.currentSalary > 0,
  };
}

// All rostered players, best Trade Value first. Players without a contract are kept but flagged
// (their salary counts as 0, so their value is too high).
export async function getValuedPlayers() {
  const { league, teams } = await getLeagueWithRosters("nba");
  const players = teams
    .flatMap((team) => team.roster.map((p) => valuePlayer(p, team, league)))
    .sort((a, b) => b.value - a.value);
  return { league, teams, players };
}

export const teamMode = (t: { wins: number; losses: number }) => modeFromRecord(t.wins, t.losses);
