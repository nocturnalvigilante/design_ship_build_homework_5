-- DockCheck: the three tables from AGENTS.md, each holding one person's data.
-- user_id is the Clerk user id, taken from the signed-in user's token (auth.jwt()->>'sub').
-- Every table has row-level security: you can only select, insert, update or delete your own rows.

-- The stations you use, like "Lab" (Ellis & 58th).
create table public.saved_stations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  station_id text not null,
  nickname text not null check (char_length(nickname) between 1 and 40),
  need text not null check (need in ('bike', 'dock')),
  created_at timestamptz not null default now(),
  unique (user_id, station_id)
);

-- When you usually leave from a saved station. weekdays: 0 = Sunday … 6 = Saturday.
create table public.departures (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  saved_station_id uuid not null references public.saved_stations (id) on delete cascade,
  weekdays smallint[] not null check (cardinality(weekdays) > 0 and weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  leave_at time not null,
  created_at timestamptz not null default now()
);

-- Each time you looked: what was at the station.
create table public.checks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  station_id text not null,
  bikes integer not null check (bikes >= 0),
  ebikes integer not null check (ebikes >= 0),
  docks integer not null check (docks >= 0),
  checked_at timestamptz not null default now()
);

create index on public.saved_stations (user_id);
create index on public.departures (user_id);
create index on public.departures (saved_station_id);
create index on public.checks (user_id, station_id, checked_at);

alter table public.saved_stations enable row level security;
alter table public.departures enable row level security;
alter table public.checks enable row level security;

-- New tables are not exposed automatically in this project, so grant signed-in users
-- access explicitly. Signed-out visitors (anon) get nothing.
grant select, insert, update, delete on public.saved_stations, public.departures, public.checks to authenticated;

-- saved_stations: only your own rows.
create policy "Users see their own saved stations" on public.saved_stations
  for select to authenticated using ((select auth.jwt() ->> 'sub') = user_id);
create policy "Users add their own saved stations" on public.saved_stations
  for insert to authenticated with check ((select auth.jwt() ->> 'sub') = user_id);
create policy "Users change their own saved stations" on public.saved_stations
  for update to authenticated using ((select auth.jwt() ->> 'sub') = user_id)
  with check ((select auth.jwt() ->> 'sub') = user_id);
create policy "Users delete their own saved stations" on public.saved_stations
  for delete to authenticated using ((select auth.jwt() ->> 'sub') = user_id);

-- departures: only your own rows, and only attached to a station you saved.
create policy "Users see their own departures" on public.departures
  for select to authenticated using ((select auth.jwt() ->> 'sub') = user_id);
create policy "Users add departures to their own stations" on public.departures
  for insert to authenticated with check (
    (select auth.jwt() ->> 'sub') = user_id
    and exists (
      select 1 from public.saved_stations s
      where s.id = saved_station_id and s.user_id = (select auth.jwt() ->> 'sub')
    )
  );
create policy "Users change their own departures" on public.departures
  for update to authenticated using ((select auth.jwt() ->> 'sub') = user_id)
  with check (
    (select auth.jwt() ->> 'sub') = user_id
    and exists (
      select 1 from public.saved_stations s
      where s.id = saved_station_id and s.user_id = (select auth.jwt() ->> 'sub')
    )
  );
create policy "Users delete their own departures" on public.departures
  for delete to authenticated using ((select auth.jwt() ->> 'sub') = user_id);

-- checks: only your own rows.
create policy "Users see their own checks" on public.checks
  for select to authenticated using ((select auth.jwt() ->> 'sub') = user_id);
create policy "Users add their own checks" on public.checks
  for insert to authenticated with check ((select auth.jwt() ->> 'sub') = user_id);
create policy "Users change their own checks" on public.checks
  for update to authenticated using ((select auth.jwt() ->> 'sub') = user_id)
  with check ((select auth.jwt() ->> 'sub') = user_id);
create policy "Users delete their own checks" on public.checks
  for delete to authenticated using ((select auth.jwt() ->> 'sub') = user_id);
