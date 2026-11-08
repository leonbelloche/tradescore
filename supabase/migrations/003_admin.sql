-- Admin dashboard: daily counters (visits, sign-ups). Run once in the Supabase SQL Editor. Safe to re-run.
-- Only NUMBERS are stored: no name, no email, no password, no IP.
create table if not exists daily_stats (
  day date not null,
  kind text not null,          -- 'visit' (one per browser per day) or 'signup'
  count int not null default 0,
  primary key (day, kind)
);

-- Private: no public policy, so only the secret key (server) can read or write it.
alter table daily_stats enable row level security;

-- +1 on today's counter, in one atomic step.
create or replace function bump_stat(p_kind text) returns void
language sql security definer set search_path = public as $$
  insert into daily_stats (day, kind, count)
  values ((now() at time zone 'America/New_York')::date, p_kind, 1)
  on conflict (day, kind) do update set count = daily_stats.count + 1;
$$;
revoke all on function bump_stat(text) from public, anon, authenticated;
