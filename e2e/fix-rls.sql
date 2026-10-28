-- Undo break-rls.sql: back to "you only see your own follows",
-- exactly as in supabase/migrations/20261028065844_live_tables.sql.
drop policy "BROKEN: everyone sees all follows" on public.follows;
create policy "Users see their own follows" on public.follows
  for select to authenticated using ((select auth.jwt() ->> 'sub') = user_id);
