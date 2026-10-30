-- Supabase Cron calls the poll-divvy Edge Function every 30 s (docs/data-flow.md, arrow 0).
-- pg_cron schedules the job; pg_net makes the HTTP call from Postgres.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- The function only runs for a caller sending one of the project's secret keys
-- on the apikey header. That key is kept in Vault as 'cron_secret_key' (created
-- by hand in the SQL editor, never in a migration or commit) and read at call time.
-- Divvy updates about every 60 s, so 30 s is often enough: ~86,000 calls a month
-- of the free plan's 500,000.
select cron.schedule(
  'poll-divvy',
  '30 seconds',
  $$
  select net.http_post(
    url := 'https://ecpppyiclszsuyeeccyl.supabase.co/functions/v1/poll-divvy',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret_key')
    ),
    body := '{}'::jsonb,
    -- pg_net's default is 5 s; a run reads ~2,000 rows and calls Divvy, so allow more.
    timeout_milliseconds := 25000
  );
  $$
);
