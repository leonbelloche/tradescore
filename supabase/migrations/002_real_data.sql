-- Real NBA data: ESPN ids, short names, trade dates and source text.
-- Safe to re-run.

alter table teams add column if not exists espn_id text unique;
alter table teams add column if not exists short_name text;
alter table players add column if not exists espn_id text unique;
alter table players add column if not exists headshot_url text;
-- Where the contract row comes from: 'espn' (automatic) or 'manual' (data/contracts.csv).
alter table contracts add column if not exists source text not null default 'manual';

alter table trades add column if not exists slug text unique;
alter table trades add column if not exists trade_date date;
alter table trades add column if not exists source_text text;
