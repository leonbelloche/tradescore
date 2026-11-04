-- TradeLab database schema.
-- Run this once in the Supabase SQL Editor (it is safe to re-run: it drops and recreates everything).

drop table if exists trades cascade;
drop table if exists contracts cascade;
drop table if exists players cascade;
drop table if exists teams cascade;
drop table if exists leagues cascade;

-- One row per league (NBA now, NHL/NFL/MLB later).
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
  name text not null,
  slug text not null unique,
  abbreviation text not null,
  logo_url text,
  wins int not null default 0,         -- current season record (used later for contender/rebuild mode)
  losses int not null default 0
);

create table players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete set null,  -- null = free agent
  name text not null,
  slug text not null unique,
  position text not null,
  age int not null,
  stats_json jsonb not null default '{}'::jsonb  -- per-game stats, keyed by season
);

-- One row per remaining season of a player's contract.
create table contracts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  season text not null,
  salary bigint not null,
  unique (player_id, season)
);

create table trades (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  teams_json jsonb not null,
  assets_json jsonb not null,
  scores_json jsonb
);

create index on teams (league_id);
create index on players (team_id);
create index on contracts (player_id);

-- Security: anyone can READ the public data, nobody can write with the public key.
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
