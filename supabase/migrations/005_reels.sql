-- Admin: public storage for the weekly Instagram Reels (Instagram downloads the video from here).
-- Run once in the Supabase SQL Editor. Safe to re-run.
insert into storage.buckets (id, name, public)
values ('reels', 'reels', true)
on conflict (id) do nothing;
