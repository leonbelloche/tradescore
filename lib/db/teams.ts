import { supabase } from "./client";
import type { Contract, League, Player, Team } from "./types";

export type RosterPlayer = Player & {
  contracts: Contract[];
  currentSalary: number;       // salary for the league's current season
  yearsLeft: number;           // seasons left on the contract, current one included
  totalRemaining: number;      // sum of all remaining salaries
};

export type TeamWithRoster = Team & {
  roster: RosterPlayer[];
  payroll: number;             // sum of current-season salaries
  capSpace: number;            // cap - payroll (negative = over the cap)
};

export type TeamDetails = TeamWithRoster & { league: League };

type TeamRow = Team & { players: (Player & { contracts: Contract[] })[] };

const TEAM_WITH_PLAYERS = "*, players(*, contracts(*))";

// Turns raw rows into a roster sorted by salary, with payroll totals.
function withRoster(row: TeamRow, league: League): TeamWithRoster {
  const { players, ...team } = row;
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
  return { ...team, roster, payroll, capSpace: league.salary_cap - payroll };
}

export async function getTeams(): Promise<Team[]> {
  const { data, error } = await supabase.from("teams").select("*").order("name");
  if (error) throw new Error(`Could not load teams: ${error.message}`);
  return data;
}

export async function getTeamBySlug(slug: string): Promise<TeamDetails | null> {
  const { data, error } = await supabase
    .from("teams")
    .select(`${TEAM_WITH_PLAYERS}, league:leagues(*)`)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Could not load team "${slug}": ${error.message}`);
  if (!data) return null;

  const { league, ...row } = data as TeamRow & { league: League };
  return { ...withRoster(row, league), league };
}

// Everything the trade simulator needs: the league and every team with its roster.
export async function getLeagueWithRosters(
  leagueId: string,
): Promise<{ league: League; teams: TeamWithRoster[] }> {
  const [leagueRes, teamsRes] = await Promise.all([
    supabase.from("leagues").select("*").eq("id", leagueId).single(),
    supabase.from("teams").select(TEAM_WITH_PLAYERS).eq("league_id", leagueId).order("name"),
  ]);
  if (leagueRes.error) throw new Error(`Could not load league "${leagueId}": ${leagueRes.error.message}`);
  if (teamsRes.error) throw new Error(`Could not load teams: ${teamsRes.error.message}`);

  const league = leagueRes.data as League;
  const teams = (teamsRes.data as TeamRow[]).map((row) => withRoster(row, league));
  return { league, teams };
}
