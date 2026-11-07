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
  short_name: string | null; // "Lakers"
  espn_id: string | null;
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
  espn_id: string | null;
  headshot_url: string | null;
  stats_json: Record<string, SeasonStats>;
};

export type Contract = {
  id: string;
  player_id: string;
  season: string;
  salary: number;
  source: "espn" | "manual";
};

// One asset of a stored trade (see data/trades.json).
export type TradeAssetRow =
  | { name: string; espn_id: string | null; from: string; to: string } // team abbreviations
  | { pick: "considerations" | "second" | "first"; year?: number; from: string; to: string };

export type TradeRow = {
  id: string;
  slug: string;
  trade_date: string;
  source_text: string | null;
  teams_json: string[]; // team abbreviations
  assets_json: TradeAssetRow[];
};
