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
