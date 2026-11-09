-- Admin: history of what was published on X and Instagram from the admin. Run once in the Supabase SQL Editor. Safe to re-run.
create table if not exists social_posts (
  id text primary key,              -- "<channel>:<day>-<post>"
  channel text not null,            -- 'x' or 'instagram'
  day date not null,
  text text not null,
  image text,                       -- path of the generated image
  remote_id text,                   -- id of the post on X / Instagram
  remote_url text,                  -- link to the post
  posted_at timestamptz not null default now()
);
create index if not exists social_posts_day on social_posts (day);

-- Private: only the server (secret key) reads and writes it.
alter table social_posts enable row level security;
