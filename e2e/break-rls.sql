-- Step 7 of the brief: break row-level security ON PURPOSE, watch the
-- Playwright test fail, then run fix-rls.sql and watch it pass.
--
-- Run this in Supabase → SQL Editor. Afterwards any signed-in user can see
-- every saved station, not just their own. Signed-out visitors still get nothing.
drop policy "Users see their own saved stations" on public.saved_stations;
create policy "BROKEN: everyone sees all saved stations" on public.saved_stations
  for select to authenticated using (true);
