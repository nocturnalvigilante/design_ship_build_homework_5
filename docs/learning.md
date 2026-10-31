# What I learned building DockCheck Live (Assignment 5)

The brief ends each step with an "Ask your agent" prompt. These are the answers, about this system, in the order of the steps.

## 1. The Divvy response: what each field means, how often it changes, and which fields the app needs

*"Explain this response: what each field means, how often it changes, and which fields my app needs."*

Called twice, 3 minutes apart, just after midnight on 28 Oct 2026 (`docs/evidence/source-called-twice.txt`, raw responses beside it):

- The feed refreshed between calls (`last_updated` 00:01:08 → 00:04:09). `ttl` is 60 s, so it can change every minute.
- **30 of 2,076 stations** had different counts after 3 minutes, even at midnight. Daytime will be busier.
- But **1,116 stations** had a new `last_reported`. A station checks in every few minutes **even when nothing changed**.

| Field | Meaning | How often it changes | Needed? |
|---|---|---|---|
| `last_updated` (feed) | when Divvy built this snapshot | every ~60 s | **yes**: freshness |
| `ttl` (feed) | seconds until the next snapshot | fixed, 60 | yes: how often to poll |
| `station_id` | stable id, joins to `station_information` | never | **yes**: the key |
| `num_bikes_available` | rentable bikes, classic + e-bikes | often | **yes** |
| `num_ebikes_available` | the e-bikes among them | often | **yes** |
| `num_docks_available` | free docks to return a bike | often | **yes** |
| `num_bikes_disabled` / `num_docks_disabled` | broken bikes or docks | rarely | no |
| `is_renting` / `is_returning` | station switched off for renting / returning | rarely | **yes**: "closed" state |
| `last_reported` | when this station last checked in | every few minutes, **even with no change** | stored, but **not** used to decide "changed" |

**What this means for the worker:** "changed" has to mean *the counts or renting/returning changed*, not `last_reported`. Comparing `last_reported` would rewrite ~1,100 rows every run, and every rewrite is a Realtime message to every open page. Comparing the counts rewrites ~30.

## 2. MCP servers and CLIs this project can use

*"List the MCP servers and CLIs you can use in this project, and what you'd use each one for. Then check that each one works."* Checked 2026-10-30.

| Tool | What it's for here | Works? |
|---|---|---|
| **Supabase MCP** (scoped to `ecpppyiclszsuyeeccyl`, features `database,docs,development,debugging,functions`, not read-only) | tables, migrations, SQL, RLS, Realtime publication, logs, deploying the Edge Function, cron | ✅ listed 3 tables (`follows` 3 rows, `station_status` 2,077, `runs` 1,653, all RLS on); `poll-divvy` ACTIVE; cron job active; last run 19 s before the check; read the function's logs |
| **git** (SSH to GitHub) | small commits on branches; a push to `main` makes Vercel deploy | ✅ `origin/main` = local `main` (`0006fcd`) |
| **Vercel** (GitHub integration, no CLI) | builds and hosts the page on every push to `main`; env vars set by you in the dashboard | ✅ the last push was live in ~60 s |
| **Node 22 / npm / npx** (fe02) | `npm run dev`, `build`, `lint`, `test:worker` | ✅ v22.11.0 |
| **Playwright** 1.63 | end-to-end tests, locally or against the live site with `BASE_URL` | ✅ 10 passed locally; feedback spec passed live |
| **ffmpeg** | pulling frames and audio out of screen recordings (grader feedback video) | ✅ 4.2.7 |
| **Clerk CLI** `clerk` | the brief lists it; would manage users and keys from the terminal | ❌ not installed. Clerk is configured in its dashboard; installing needs your OK |
| **Supabase CLI**, **Vercel CLI**, **GitHub CLI** `gh` | not needed: the MCP, Vercel's GitHub integration and plain git cover them | ❌ not installed |
| Claude artifacts / Docs MCPs, VS Code MCP | publishing pages, editor diagnostics; not used by this app | available |
| Google Docs / Drive MCPs | not used | need sign-in in claude.ai |

## 3. Walking through the data flow chart

*"Walk me through the chart: what each part sends to the next, and what would break if one part changed it."* (Chart: [`docs/data-flow.md`](data-flow.md).)

- **Cron → worker.** Supabase Cron POSTs to the Edge Function every 30 s with a secret key from Vault. Without the key the function answers 401 and records nothing, so the page goes **stale**.
- **Divvy → worker.** On each call the worker GETs `station_status.json`: per station the counts, `is_renting`/`is_returning` and `last_reported`, plus the feed's `last_updated`. If Divvy renamed a field or moved the URL, the worker can't parse it, logs the run as failed, and the page shows **down**. Nothing wrong is saved; counts just stop moving, and the page says so. If Divvy stops answering, the 8 s timeout makes sure the failed run is still recorded (without it, a hung request would look **stale** instead of **down**).
- **Worker → `station_status`.** On every call the worker reads the last saved counts from `station_status` (an Edge Function keeps nothing between calls), compares, and upserts only stations whose counts or status changed. Comparing `last_reported` too would write ~1,100 rows a run instead of ~30, and each write is a Realtime message. Keeping the snapshot in memory instead could skip a real change when two warm copies disagree with the table.
- **Worker → `runs`.** One row every run, even with 0 changes or a failure. Without it the page couldn't tell "nothing changed" from "worker dead".
- **`station_status` → page (Realtime).** A changed row is pushed only if the table is in the publication, `authenticated` can `select` it, and RLS lets this person read it (they follow that station). Miss any one and Realtime sends nothing, with no error.
- **`runs` → page (Realtime).** Keeps "checked 20 s ago" honest and drives stale and down, even when your stations haven't changed.
- **Page → `follows`.** A Server Action behind `auth.protect()`; `user_id` comes from the Clerk token; RLS keeps each person to their own rows. Unfollowing also stops that station's updates, because the `station_status` policy checks `follows`.
- **Clerk → page.** The session token's `sub` is your id for RLS. If Clerk weren't a third-party provider in Supabase, `auth.jwt()->>'sub'` would be empty and every table would look empty.
- **Divvy `station_information` → server.** Names and capacity for search and labels, cached 60 s. If it fails, search breaks, but live counts keep arriving.

**Stale vs down, in one line:** down = the worker is alive and reporting that Divvy failed; stale = the worker has stopped reporting at all.

## 4. The worker's last three runs

*"Show me the worker's logs from its last three runs, and explain each line."* From Supabase logs (`function_logs`, `function_edge_logs`) and the `runs` table, 2026-10-30 (times UTC):

```
06:41:52.446  run ok changed=0 feed=2026-10-30T06:40:25.000Z took=914ms   POST 200 1012 ms   runs #1651
06:42:21.729  run ok changed=9 feed=2026-10-30T06:41:25.000Z took=234ms   POST 200  349 ms   runs #1652
06:42:51.707  run ok changed=0 feed=2026-10-30T06:41:25.000Z took=203ms   POST 200  311 ms   runs #1653
```

- **`run ok`**: the call fetched Divvy, compared, saved and recorded itself without an error. A failure would say `run FAILED error="…"` and the page would show **down**.
- **`changed=0 / 9 / 0`**: stations whose counts or renting/returning differed from what was saved. Only those 9 rows were upserted, so only 9 Realtime messages went out, and only to people following those stations.
- **`feed=…`**: Divvy's own `last_updated`. It moved 06:40:25 → 06:41:25 between the first two runs (a new snapshot, so changes), and stayed at 06:41:25 for the third (same snapshot, so 0 changes). That's why about half the runs report 0: we poll every 30 s, Divvy updates every 60 s.
- **`took=`**: time inside the function. The first was slower (914 ms), likely Divvy or the database answering slower on that call; still far under the 8 s timeout.
- **`POST 200`** (edge logs): Cron's call was accepted (right secret key) and the run succeeded. A wrong key would be `401` with no `run` line and no `runs` row.
- Each call also logs `booted` and `shutdown`: Supabase starts the function for the call and stops it after, which is why the snapshot is read from the table every time.

## 5. Tracing one update from Divvy to the screen

*"Trace one update for me, from the source to my screen, and name every part it passes through."* A real one: **Woodlawn Ave & 55th St** (followed by one user), 30 Oct 2026, 06:30 UTC.

1. **Divvy** publishes a new `station_status.json` snapshot: Woodlawn & 55th now has 4 bikes (2 e-bikes), 13 docks.
2. **Supabase Cron** (pg_cron job `poll-divvy`) fires on its 30 s schedule; **pg_net** POSTs to the Edge Function with the secret key read from **Vault**.
3. **Edge Function `poll-divvy`** checks the key, then in parallel reads the saved counts from `station_status` and GETs Divvy's feed. `parseFeed` turns the feed into rows; `changedRows` finds 13 stations that differ, Woodlawn & 55th among them.
4. **PostgREST** receives one upsert of those 13 rows (secret key, bypasses RLS); **Postgres** updates the row, `updated_at` = 06:30:20.948. The function then inserts **`runs` #1628** (`ok`, `rows_changed = 13`).
5. **Realtime** sees the change through the `supabase_realtime` publication (which holds `station_status` and `runs`). For each subscriber it checks the RLS policy *"Users see stations they follow"*: is there a `follows` row for this station whose `user_id` is the subscriber's Clerk `sub`? Only the one follower gets the `UPDATE`.
6. **The browser** (page from **Vercel**) is subscribed on channel `live` with the user's **Clerk** session token (`accessToken` in `supabase-browser.ts`). `LiveStations` receives the row, the count changes and flashes (the `tick` class), and "Counts last changed" resets.
7. The `runs` INSERT also arrives over Realtime, so the freshness line says **"Live · checked N s ago"**, and keeps counting even when nothing you follow changes.

## Free tier limits and how to cap spending (E7)

*"Walk me through the free tier limits for each service my app uses, and how to set usage limits and spending alerts for each one."*

**Supabase Free** (from Supabase's billing docs, checked 2026-10-30), against what this app uses:

| Limit (per month unless noted) | Free | DockCheck Live |
|---|---|---|
| Edge Function invocations | 500,000 | ~86,400 (every 30 s), about 17% |
| Realtime messages | 2 million | only changed rows of followed stations, to their followers; ~8,500 rows changed in the last day across *all* stations, so a few thousand messages at most |
| Realtime peak connections | 200 | one per open page |
| Database size | 500 MB per project | 13 MB; `runs` grows ~2,900 rows a day, tiny |
| Egress | 5 GB | small JSON rows |
| Projects | 2 free | 2 (A4's, this one) |
| Inactivity | paused after a week unused | open the app now and then until grades are back |

*How to cap it:* Dashboard → Organization → **Billing**: stay on Free and keep **Spend cap on**. On Free, going over a quota restricts the service instead of billing you. **Usage** shows each item against its quota.

**Vercel Hobby**: free for personal, non-commercial projects. It has monthly limits on bandwidth and function use, and Hobby doesn't bill for overage: if a limit is hit, the deployment is paused. Check Vercel → Settings → **Billing** says Hobby with no card, and **Usage** for current numbers.

**Clerk (development instance, free plan)**: development instances are for testing and are capped on users; ours has 3. Check Clerk → **Billing** says Free with no card. Nothing to cap unless you upgrade.

**Rule for all three:** no card on file; if one is ever required, set the cap first.

## 6. Quiz on how the system works (Be Ready to Explain)

*"Quiz me on how my system works, one question at a time, and tell me what I got wrong. Start with the questions in Be Ready to Explain."* 2026-10-31. Four questions, one per F1–F4; answered together, then checked against the code and logs.

**Q1 (F1, tracing a change).** A bike is taken from Ellis & 58th ("Lab"). What happens until the page shows one fewer?
Answer: Divvy's feed drops `num_bikes_available`; Cron POSTs `poll-divvy` with the Vault key (else 401); `runOnce` loads the snapshot and the feed in parallel; `changedRows` finds Lab's `bikes` differs; the changed rows are upserted with `updated_at`; a `runs` row is inserted; Realtime sends the `UPDATE` on channel `live` (filter `station_id=in.(…)`, RLS checks `follows`); `setStatuses` and `setBumps` update; the card re-renders and the tick plays; the `runs` INSERT resets "checked N s ago". **Correct.**

**Q2 (F2, the data flow).** What counts as a change, and what breaks if `last_reported` counted?
Answer: any of `bikes, ebikes, docks, is_renting, is_returning` differing, or a station missing from the snapshot. Counting `last_reported` would rewrite most stations every run, flood Realtime, fire the tick on unchanged cards, and make `rows_changed` meaningless. **Correct, one number off:** about **1,100** rows a run (1,116 of 2,076 moved `last_reported` in 3 min), not ~2,000. Still ~40× the ~28 real changes.

**Q3 (F3, freshness).** Where does "checked 20 s ago" come from; stale vs down?
Answer: `ago(latestRun.finished_at, now)`; `latestRun` is the newest `runs` row (server render, then Realtime INSERTs, then `catchUp()` after reconnect); `now` ticks every 5 s. `freshness()`: not connected → loading; no run in 2 min → **stale** ("Updates have paused"); else `ok` ? fresh : **down**. Stale is silence; down is the worker reporting a failure. **Correct.**

**Q4 (F4, agentic workflow).** What does `npm run test:worker` check; what did the last three runs show?
Answer: seven tests on two saved Divvy responses 3 min apart, no network: parses all 2,076; saves exactly the 28 changed; `last_reported` alone isn't a change (>1,000 such); disabled bikes/docks alone isn't; same response twice saves nothing; empty snapshot saves all; non-GBFS throws so the run is logged failed. Runs: changed 0 / 9 / 0, ~30 s apart, run 3 saw the same `feed_last_updated` as run 2. **Mostly correct.** Corrections: seven *tests*, not assertions. And the 914 ms first run was **not** a cold start followed by warm ones: every call logs `booted` and `shutdown`, so all three were cold; that one call was just slower (Divvy or the database).
