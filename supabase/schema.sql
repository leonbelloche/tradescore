-- TradeLab database schema (real data version). Run once in the Supabase SQL Editor on an EMPTY project.
-- Data is then loaded with: node scripts/import-db.mjs

create table leagues (
  id text primary key,                 -- 'nba'
  name text not null,
  current_season text not null,        -- '2026-27'
  salary_cap bigint not null,          -- in dollars, for the current season
  rules_json jsonb not null default '{}'::jsonb  -- league-specific trade rules
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  league_id text not null references leagues(id),
  name text not null,                  -- "Los Angeles Lakers"
  slug text not null unique,
  abbreviation text not null,          -- "LAL"
  logo_url text,
  wins int not null default 0,         -- current season record
  losses int not null default 0,
  espn_id text unique,
  short_name text                      -- "Lakers"
);

create table players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete set null,  -- null = free agent
  name text not null,
  slug text not null unique,
  position text not null,
  age int not null,
  stats_json jsonb not null default '{}'::jsonb,  -- per-game stats, keyed by season
  espn_id text unique,
  headshot_url text
);

-- One row per remaining season of a player's contract.
create table contracts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  season text not null,
  salary bigint not null,
  source text not null default 'manual',  -- 'espn' or 'manual' (data/contracts.csv)
  unique (player_id, season)
);

create table trades (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  teams_json jsonb not null,           -- team abbreviations
  assets_json jsonb not null,          -- see data/trades.json
  scores_json jsonb,
  slug text unique,
  trade_date date,
  source_text text                     -- ESPN wording
);

create index on teams (league_id);
create index on players (team_id);
create index on contracts (player_id);

-- Security: anyone can READ, only the secret key (import script) can write.
alter table leagues enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table contracts enable row level security;
alter table trades enable row level security;

create policy "public read" on leagues for select using (true);
create policy "public read" on teams for select using (true);
create policy "public read" on players for select using (true);
create policy "public read" on contracts for select using (true);
create policy "public read" on trades for select using (true);
