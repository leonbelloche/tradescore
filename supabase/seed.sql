-- 4 FICTIONAL demo teams. Run AFTER schema.sql.
-- Each player has a target Game Score (gmsc). Postgres builds a realistic
-- per-game stat line from a base line per role, scaled to hit that target.

insert into leagues (id, name, current_season, salary_cap, rules_json) values
  ('nba', 'NBA', '2026-27', 165000000,
   '{"salaryMatching":{"maxIncomingRatio":1.25,"marginDollars":250000},"capGrowthPerYear":0.07}');

insert into teams (league_id, name, slug, abbreviation, wins, losses) values
  ('nba', 'Metro City Comets',   'metro-city-comets',   'MET', 7, 1),
  ('nba', 'Harbor Bay Mariners', 'harbor-bay-mariners', 'HBM', 5, 3),
  ('nba', 'Summit Peaks',        'summit-peaks',        'SUM', 4, 4),
  ('nba', 'Red Rock Rattlers',   'red-rock-rattlers',   'RRR', 2, 6);

-- team, name, position, age, target Game Score, games played last season, salaries in $M from 2026-27
create temp table demo_players (team text, name text, position text, age int, gmsc numeric, gp int, salaries numeric[]);
insert into demo_players values
  ('metro-city-comets', 'Marcus Bell',     'SF', 27, 21, 78, '{52.0,54.6,57.3}'),
  ('metro-city-comets', 'Dante Okafor',    'PG', 31, 17, 58, '{44.0,46.2}'),
  ('metro-city-comets', 'Theo Vasquez',    'C',  29, 14, 74, '{34.0,34.0,34.0}'),
  ('metro-city-comets', 'Isaiah Grant',    'C',  26,  7, 70, '{12.0,12.0}'),
  ('metro-city-comets', 'Jalen Price',     'SG', 24, 11, 80, '{12.5,13.4}'),
  ('metro-city-comets', 'Rui Tanaka',      'PF', 33,  9, 66, '{14.0}'),
  ('metro-city-comets', 'Caleb Moore',     'SG', 22,  8, 75, '{4.2,4.5,4.8}'),
  ('metro-city-comets', 'Andre Lewis',     'F',  35,  5, 52, '{5.0}'),
  ('metro-city-comets', 'Noah Fischer',    'PG', 20,  6, 61, '{2.9,3.1,3.3}'),
  ('harbor-bay-mariners', 'Kofi Mensah',     'PG', 25, 19, 79, '{45.0,47.3,49.6,52.1}'),
  ('harbor-bay-mariners', 'Luca Romano',     'C',  28, 15, 72, '{32.0,32.0,32.0}'),
  ('harbor-bay-mariners', 'Ben Carter',      'PF', 30, 12, 68, '{27.0,27.0}'),
  ('harbor-bay-mariners', 'Sam Whitfield',   'SG', 27, 11, 81, '{21.0,21.5,22.0}'),
  ('harbor-bay-mariners', 'Omar Haddad',     'PG', 32,  9, 63, '{15.0}'),
  ('harbor-bay-mariners', 'Tyrese Holloway', 'SF', 23, 13, 77, '{9.5,10.2}'),
  ('harbor-bay-mariners', 'Victor Nunes',    'G',  26,  6, 59, '{7.0}'),
  ('harbor-bay-mariners', 'Eli Brooks',      'C',  21,  7, 64, '{6.5,6.9,7.3}'),
  ('harbor-bay-mariners', 'Jamal Reed',      'F',  29,  5, 48, '{5.0}'),
  ('summit-peaks', 'Adrian Wolfe',   'SG', 26, 18, 76, '{42.0,43.7,45.4,47.2}'),
  ('summit-peaks', 'Mateo Silva',    'PF', 24, 14, 80, '{26.0,26.0,26.0}'),
  ('summit-peaks', 'Chris Dunn',     'C',  30, 12, 71, '{25.0,25.0}'),
  ('summit-peaks', 'Felix Strand',   'SF', 28, 10, 74, '{20.0,20.0}'),
  ('summit-peaks', 'Kyle Barnes',    'G',  33,  8, 60, '{14.0}'),
  ('summit-peaks', 'Jordan Ellis',   'PG', 22, 12, 79, '{8.8,9.4}'),
  ('summit-peaks', 'Pierre Laurent', 'C',  27,  6, 55, '{6.0,6.0}'),
  ('summit-peaks', 'Malik Owens',    'F',  20,  7, 67, '{5.5,5.9,6.3}'),
  ('summit-peaks', 'Devin Shaw',     'G',  24,  5, 41, '{2.6}'),
  ('red-rock-rattlers', 'Darius King',   'C',  32, 11, 62, '{34.0,34.0}'),
  ('red-rock-rattlers', 'Marco Bianchi', 'PG', 29, 13, 75, '{30.0,30.0,30.0}'),
  ('red-rock-rattlers', 'Grant Fowler',  'F',  26,  8, 70, '{15.0,15.0}'),
  ('red-rock-rattlers', 'Elijah Stone',  'PF', 21, 16, 80, '{11.5,12.3}'),
  ('red-rock-rattlers', 'Leo Martins',   'SF', 19,  9, 72, '{9.0,9.6,10.1}'),
  ('red-rock-rattlers', 'Isaac Romero',  'G',  28,  6, 66, '{9.0}'),
  ('red-rock-rattlers', 'Nate Hughes',   'SG', 23, 10, 77, '{7.0,7.5}'),
  ('red-rock-rattlers', 'Aaron Cole',    'C',  24,  7, 58, '{4.0,4.0}'),
  ('red-rock-rattlers', 'Tyson Webb',    'F',  22,  5, 49, '{2.3,2.5}');

-- Base per-game lines by role.
create temp table demo_base (role text, min numeric, pts numeric, fgm numeric, fga numeric, ftm numeric, fta numeric,
  orb numeric, drb numeric, ast numeric, stl numeric, blk numeric, tov numeric, pf numeric);
insert into demo_base values
  ('guard', 30, 14, 5.2, 11.5, 2.4, 2.9, 0.5, 3.0, 4.5, 1.0, 0.3, 2.0, 2.0),
  ('wing',  30, 14, 5.3, 11.4, 2.2, 2.8, 0.9, 4.0, 2.5, 1.0, 0.5, 1.5, 2.2),
  ('big',   28, 13, 5.4,  9.8, 2.0, 2.9, 2.5, 6.5, 2.0, 0.7, 1.3, 1.7, 2.8);

-- Builds a stat line whose Hollinger Game Score equals `target`.
create function pg_temp.stat_line(pos text, target numeric, gp int) returns jsonb language sql as $$
  with b as (
    select * from demo_base where role = case when pos in ('PG','SG','G') then 'guard' when pos in ('SF','F') then 'wing' else 'big' end
  ), k as (
    select target / (pts + 0.4*fgm - 0.7*fga - 0.4*(fta-ftm) + 0.7*orb + 0.3*drb + stl + 0.7*ast + 0.7*blk - 0.4*pf - tov) as k from b
  )
  select jsonb_build_object('gp', gp, 'min', least(38, round(min*sqrt(k), 1)),
    'pts', round(pts*k,1), 'fgm', round(fgm*k,1), 'fga', round(fga*k,1), 'ftm', round(ftm*k,1), 'fta', round(fta*k,1),
    'orb', round(orb*k,1), 'drb', round(drb*k,1), 'ast', round(ast*k,1), 'stl', round(stl*k,1), 'blk', round(blk*k,1),
    'tov', round(tov*k,1), 'pf', round(pf*k,1))
  from b, k
$$;

-- Last season = target level. This season (8 team games so far) = adjusted for age.
insert into players (team_id, name, slug, position, age, stats_json)
select t.id, d.name, trim(both '-' from lower(regexp_replace(d.name, '[^A-Za-z0-9]+', '-', 'g'))), d.position, d.age,
  jsonb_build_object(
    '2025-26', pg_temp.stat_line(d.position, d.gmsc, d.gp),
    '2026-27', pg_temp.stat_line(d.position,
      round(d.gmsc * case when d.age <= 22 then 1.06 when d.age <= 25 then 1.03 when d.age <= 28 then 1.0 when d.age <= 30 then 0.97 else 0.93 end, 1),
      least(8, round(d.gp / 82.0 * 8)::int)))
from demo_players d join teams t on t.slug = d.team;

-- One contract row per season: 1st salary = 2026-27, 2nd = 2027-28, ...
insert into contracts (player_id, season, salary)
select p.id, (2025 + s.i) || '-' || lpad(((26 + s.i) % 100)::text, 2, '0'), round(s.salary * 1000000)
from demo_players d
join players p on p.name = d.name
cross join lateral unnest(d.salaries) with ordinality as s(salary, i);

drop function pg_temp.stat_line;
drop table demo_players, demo_base;
