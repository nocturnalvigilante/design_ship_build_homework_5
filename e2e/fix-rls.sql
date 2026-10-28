-- Undo break-rls.sql: back to "you only see your own saved stations",
-- exactly as in supabase/migrations/20261024093146_initial_tables.sql.
drop policy "BROKEN: everyone sees all saved stations" on public.saved_stations;
create policy "Users see their own saved stations" on public.saved_stations
  for select to authenticated using ((select auth.jwt() ->> 'sub') = user_id);
