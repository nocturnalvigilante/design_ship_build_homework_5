# Security review: branch `step3-data-flow` (2026-10-28)

`/security-review` run before merging into `main`, as AGENTS.md requires. **Result: no high-confidence vulnerabilities.**

| Area | Why it's safe |
|---|---|
| Reading or deleting another user's follows | `unfollowStation` deletes by id through the user's own Clerk-token client; RLS `(select auth.jwt()->>'sub') = user_id` on select/update/delete makes a foreign id match 0 rows. |
| Following as someone else | `user_id` defaults from the JWT; the insert policy's `with check` rejects any other value, even via PostgREST directly. |
| Users writing `station_status` / `runs` | `authenticated` has only `select`, and there are no write policies; `anon` has no grants; `service_role` gets only what the worker needs. |
| Realtime leaks | `follows` isn't published; `station_status` RLS limits each subscriber to stations they follow; `runs` holds only health fields. |
| Secret key | Read only in `worker/index.js` from env, sent only as the `apikey` header, never logged; error text never includes headers. The browser gets only `NEXT_PUBLIC_*` publishable values. No secrets in the diff. |
| `runs.error` shown to signed-in users | Only Divvy status, parse errors (station id cut to 40 chars) and PostgREST messages, capped at 500 chars. No credentials. |
| Sign-in checks | `clerkMiddleware()`; the page, both server actions and `/api/stations` start with `await auth.protect()`; `/api/status` removed. |
| XSS | No `dangerouslySetInnerHTML`, `innerHTML` or `eval`; React escapes nicknames. |

Note: `e2e/break-rls.sql` breaks RLS on purpose for the failing-test exercise. Run `e2e/fix-rls.sql` straight after.

Separately: two secret keys (Supabase secret, Clerk `dockcheck-live-local`) were pasted into the agent chat on 2026-10-28. They are not in the repo, but they must be deleted and replaced before deploying.

## edge-worker branch (2026-10-30)

`/security-review` on `main...edge-worker` (Edge Function worker + cron): **no findings.**

- No key committed (searched history for `sb_secret_`, `sk_test_`, `sk_live_`, `eyJhbGci`).
- `poll-divvy` has `verify_jwt = false` but runs only for a POST whose `apikey` is one of the project's secret keys; no key or a wrong key gets 401 (tested live).
- PostgREST paths are fixed; bodies are type-checked feed values. `runs.error` never contains a key.
- The cron job reads its key from Vault at call time; no literal secret in the migration.
- Open: the Vault key `cron_secret_key` was pasted into the agent chat; rotate before submission.

## grader-feedback branch (2026-10-30)

`/security-review` on `main...grader-feedback` (landing page, optional nickname, desktop grid): **no findings.**

- Signed-out `/` returns the static landing page before any Supabase client is created; the signed-in path still starts with `auth.protect()`. Middleware unchanged.
- `followStation` still starts with `auth.protect()`. A blank nickname falls back to the station name from the server-fetched Divvy feed, cut to 40 characters, inserted through the user's own client (RLS `with check` on `user_id`).
- No `dangerouslySetInnerHTML`; the station name in the placeholder is plain JSX. Removing `required` is client-side only; the server still checks length.

## grader-feedback-2 branch (2026-10-31)

`/security-review` on `main...grader-feedback-2` (Leaflet map, directions links, subtitle, when-to-use copy): **no findings.**

- Leaflet pins and tooltips are DOM nodes built with `textContent`; Leaflet 1.9.4 appends elements and only uses `innerHTML` for strings, so nicknames and station names are never parsed as HTML. The only HTML string is the fixed OSM attribution.
- Directions links use a fixed `https://www.google.com/maps/dir/` prefix with lat/lon from the feed; `rel="noopener noreferrer"`.
- Signed-out `/` is still the static landing page; signed-in data still behind `auth.protect()` and RLS. Nearby stations come only from Divvy's public feed, never other users' follows.
- Realtime: same filters and RLS-scoped queries, still one subscription.
- New packages: `leaflet`, `@types/leaflet` (approved). No new keys; OSM tiles need none.
