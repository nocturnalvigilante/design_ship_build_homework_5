-- rls_auto_enable() is the event-trigger helper Supabase adds for "Enable automatic RLS".
-- It only needs to run as a trigger, so nobody should be able to call it through the API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
