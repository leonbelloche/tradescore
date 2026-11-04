import { supabase } from "./client";
import type { Contract, League, Player, Team } from "./types";

export type RosterPlayer = Player & {
  contracts: Contract[];
  currentSalary: number;       // salary for the league's current season
  yearsLeft: number;           // seasons left on the contract, current one included
  totalRemaining: number;      // sum of all remaining salaries
};

export type TeamDetails = Team & {
  league: League;
  roster: RosterPlayer[];
  payroll: number;             // sum of current-season salaries
  capSpace: number;            // cap - payroll (negative = over the cap)
};

export async function getTeams(): Promise<Team[]> {
  const { data, error } = await supabase.from("teams").select("*").order("name");
  if (error) throw new Error(`Could not load teams: ${error.message}`);
  return data;
}

export async function getTeamBySlug(slug: string): Promise<TeamDetails | null> {
  const { data, error } = await supabase
    .from("teams")
    .select("*, league:leagues(*), players(*, contracts(*))")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Could not load team "${slug}": ${error.message}`);
  if (!data) return null;

  const { players, league, ...team } = data as Team & {
    league: League;
    players: (Player & { contracts: Contract[] })[];
  };

  const roster: RosterPlayer[] = players
    .map((player) => {
      const contracts = [...player.contracts].sort((a, b) => a.season.localeCompare(b.season));
      const current = contracts.find((c) => c.season === league.current_season);
      return {
        ...player,
        contracts,
        currentSalary: current?.salary ?? 0,
        yearsLeft: contracts.filter((c) => c.season >= league.current_season).length,
        totalRemaining: contracts.reduce((sum, c) => sum + c.salary, 0),
      };
    })
    .sort((a, b) => b.currentSalary - a.currentSalary);

  const payroll = roster.reduce((sum, p) => sum + p.currentSalary, 0);

  return { ...team, league, roster, payroll, capSpace: league.salary_cap - payroll };
}
