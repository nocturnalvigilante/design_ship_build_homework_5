# Live states, captured 2026-10-28 (about 5:05–5:20 AM Chicago)

Production build on fe02, worker running locally against `dockcheck-live`, Clerk test user A.
Captured by `e2e/screenshots.spec.ts` (`SHOT=fresh|tick|stale|down`).

| State | How it was produced | File |
|---|---|---|
| Fresh | worker running normally | `state-fresh.png` |
| Live tick | worker running; page left open until Realtime changed a count: Michigan Ave & 8th St went to 29, highlighted, "changed 0 s ago", no reload | `state-tick.png`, `live-tick.webm` (video) |
| Stale | worker stopped; the open page turned stale on its own about 2 min after the last run | `state-stale.png` |
| Down | worker started with `FEED_URL` pointing at a broken URL; every run logged `run FAILED error="divvy 403"` | `state-down.png` |

While recording the tick, the test also found a bug: a newly followed station showed "No live counts" until Realtime reconnected. Fixed in `8a6fd04`.
