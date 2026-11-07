-- Upgrade a database created with the first (demo) schema to the real-data schema.
-- Only needed for projects created before 2026-11-07. Safe to re-run.
alter table teams add column if not exists espn_id text unique;
alter table teams add column if not exists short_name text;
alter table players add column if not exists espn_id text unique;
alter table players add column if not exists headshot_url text;
alter table contracts add column if not exists source text not null default 'manual';
alter table trades add column if not exists slug text unique;
alter table trades add column if not exists trade_date date;
alter table trades add column if not exists source_text text;
