-- DockCheck Live: the three tables from docs/data-flow.md.
-- follows is each person's own rows (user_id = Clerk id, auth.jwt()->>'sub').
-- station_status and runs are written only by the worker, with the secret key.
-- Signed-in users can read them; Realtime pushes their changes to the page.

-- The stations you follow, like "Lab" (Ellis & 58th). Replaces A4's saved_stations.
create table public.follows (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  station_id text not null,
  nickname text not null check (char_length(nickname) between 1 and 40),
  need text not null check (need in ('bike', 'dock')),
  created_at timestamptz not null default now(),
  unique (user_id, station_id)
);

-- The latest counts at every Divvy station, one row each.
-- The worker upserts a row only when counts or is_renting/is_returning change,
-- never just because last_reported moved. It sets updated_at itself on each upsert.
create table public.station_status (
  station_id text primary key,
  bikes integer not null check (bikes >= 0), -- all rentable bikes, e-bikes included
  ebikes integer not null check (ebikes >= 0),
  docks integer not null check (docks >= 0),
  is_renting boolean not null,
  is_returning boolean not null,
  last_reported timestamptz not null,
  updated_at timestamptz not null default now()
);

-- One row per worker run, even when nothing changed or the run failed.
-- The page reads the newest row to show fresh, stale or down.
-- error is shown to signed-in users, so the worker keeps it short and free of secrets.
create table public.runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  ok boolean not null,
  rows_changed integer not null default 0 check (rows_changed >= 0),
  error text check (char_length(error) <= 500),
  feed_last_updated timestamptz
);

create index on public.follows (station_id, user_id);
create index on public.runs (finished_at desc);

alter table public.follows enable row level security;
alter table public.station_status enable row level security;
alter table public.runs enable row level security;

-- New tables are not exposed automatically in this project, so grant access explicitly.
-- Signed-in users manage their follows and only read the worker's tables.
-- The worker's secret key (service_role) bypasses RLS but still needs grants.
-- Signed-out visitors (anon) get nothing.
grant select, insert, update, delete on public.follows to authenticated;
grant select on public.station_status, public.runs to authenticated;
grant select, insert, update on public.station_status to service_role;
grant select, insert on public.runs to service_role;

-- follows: only your own rows.
create policy "Users see their own follows" on public.follows
  for select to authenticated using ((select auth.jwt() ->> 'sub') = user_id);
create policy "Users add their own follows" on public.follows
  for insert to authenticated with check ((select auth.jwt() ->> 'sub') = user_id);
create policy "Users change their own follows" on public.follows
  for update to authenticated using ((select auth.jwt() ->> 'sub') = user_id)
  with check ((select auth.jwt() ->> 'sub') = user_id);
create policy "Users delete their own follows" on public.follows
  for delete to authenticated using ((select auth.jwt() ->> 'sub') = user_id);

-- station_status: only stations you follow. Realtime checks this policy for each
-- change, so each person is sent updates for their own stations only.
create policy "Users see stations they follow" on public.station_status
  for select to authenticated using (
    exists (
      select 1 from public.follows f
      where f.station_id = station_status.station_id
        and f.user_id = (select auth.jwt() ->> 'sub')
    )
  );

-- runs: every signed-in user can see the worker's health.
create policy "Signed-in users see runs" on public.runs
  for select to authenticated using (true);

-- Realtime: send changes to these two tables to subscribed pages.
alter publication supabase_realtime add table public.station_status, public.runs;
