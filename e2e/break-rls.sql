-- Break row-level security ON PURPOSE, watch e2e/isolation.spec.ts fail,
-- then run fix-rls.sql and watch it pass.
--
-- Run this in Supabase → SQL Editor. Afterwards any signed-in user can see
-- every follow, not just their own. Signed-out visitors still get nothing.
drop policy "Users see their own follows" on public.follows;
create policy "BROKEN: everyone sees all follows" on public.follows
  for select to authenticated using (true);
