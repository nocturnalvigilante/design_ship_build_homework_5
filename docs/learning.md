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

## 3. Walking through the data flow chart

*"Walk me through the chart: what each part sends to the next, and what would break if one part changed it."* (Chart: [`docs/data-flow.md`](data-flow.md).)

- **Divvy → worker.** Every 30 s the worker GETs `station_status.json`: per station the counts, `is_renting`/`is_returning` and `last_reported`, plus the feed's `last_updated`. If Divvy renamed a field or moved the URL, the worker can't parse it, logs the run as failed, and the page shows **down**. Nothing wrong is saved; counts just stop moving, and the page says so. If Divvy stops answering, the 8 s timeout makes sure the failed run is still recorded (without it, a hung request would look **stale** instead of **down**).
- **Worker → `station_status`.** The worker keeps the last snapshot in memory (reloaded from the table on start) and upserts only stations whose counts or status changed. Comparing `last_reported` too would write ~1,100 rows a run instead of ~30, and each write is a Realtime message. Losing the snapshot on restart would rewrite all 2,076 rows once and log a misleading `rows_changed = 2076`.
- **Worker → `runs`.** One row every run, even with 0 changes or a failure. Without it the page couldn't tell "nothing changed" from "worker dead".
- **`station_status` → page (Realtime).** A changed row is pushed only if the table is in the publication, `authenticated` can `select` it, and RLS lets this person read it (they follow that station). Miss any one and Realtime sends nothing, with no error.
- **`runs` → page (Realtime).** Keeps "checked 20 s ago" honest and drives stale and down, even when your stations haven't changed.
- **Page → `follows`.** A Server Action behind `auth.protect()`; `user_id` comes from the Clerk token; RLS keeps each person to their own rows. Unfollowing also stops that station's updates, because the `station_status` policy checks `follows`.
- **Clerk → page.** The session token's `sub` is your id for RLS. If Clerk weren't a third-party provider in Supabase, `auth.jwt()->>'sub'` would be empty and every table would look empty.
- **Divvy `station_information` → server.** Names and capacity for search and labels, cached 60 s. If it fails, search breaks, but live counts keep arriving.

**Stale vs down, in one line:** down = the worker is alive and reporting that Divvy failed; stale = the worker has stopped reporting at all.
