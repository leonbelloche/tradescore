// Shapes of the rows stored in Supabase (see supabase/schema.sql).

export type League = {
  id: string;
  name: string;
  current_season: string;
  salary_cap: number;
  rules_json: Record<string, unknown>;
};

export type Team = {
  id: string;
  league_id: string;
  name: string;
  slug: string;
  abbreviation: string;
  logo_url: string | null;
  wins: number;
  losses: number;
};

export type SeasonStats = {
  gp: number;
  min: number;
  pts: number;
  fgm: number;
  fga: number;
  ftm: number;
  fta: number;
  orb: number;
  drb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pf: number;
};

export type Player = {
  id: string;
  team_id: string | null;
  name: string;
  slug: string;
  position: string;
  age: number;
  stats_json: Record<string, SeasonStats>;
};

export type Contract = {
  id: string;
  player_id: string;
  season: string;
  salary: number;
};
