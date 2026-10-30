# Edge Function worker: first runs (2026-10-30 UTC)

`poll-divvy` deployed through the Supabase MCP (version 1, `verify_jwt = false`).

Without a key it refuses to run:

```
POST /functions/v1/poll-divvy               -> 401
POST /functions/v1/poll-divvy (wrong key)   -> 401
```

Called by hand twice, then scheduled with Supabase Cron (`poll-divvy`, every 30 s).
The `runs` table afterwards:

| id | finished_at (UTC) | ok | rows_changed | how |
|---|---|---|---|---|
| 1049 | 01:40:34 | true | 1,091 | by hand: first run after ~32 h off, so many counts had moved |
| 1050 | 01:40:50 | true | 0 | by hand: same Divvy snapshot (01:39:24), so nothing saved |
| 1051 | 01:41:35 | true | 78 | **cron**: new Divvy snapshot (01:41:25) |
| 1052 | 01:42:05 | true | 0 | **cron**: same snapshot again |

`cron.job_run_details`: both cron calls `succeeded`. `net._http_response`: both `200` with
`{"ok":true,...}`. The 0-row runs are the point: Divvy publishes about every 60 s and the
worker calls every 30 s, so every other run finds nothing new and writes nothing, which
saves Realtime messages.
