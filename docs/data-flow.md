# DockCheck Live: data flow

Planned in step 3, before any worker, migration or Realtime code. Agreed 2026-10-28.

> I follow Ellis & 58th as "Lab" → a worker on Railway polls Divvy and saves only what changed → my open page ticks from 3 bikes to 2 on its own, and tells me how fresh that is.

```mermaid
flowchart LR
  D["Divvy GBFS<br/>station_status.json<br/>new snapshot ~60 s"] -->|"1 · GET every 30 s"| W["Worker (Railway)<br/>worker/ · Node.js"]
  W -->|"2 · upsert ONLY changed stations<br/>(secret key)"| S[("station_status<br/>1 row per station")]
  W -->|"3 · insert 1 row EVERY run<br/>ok / rows_changed / error"| R[("runs")]
  S -->|"4 · Realtime UPDATE<br/>RLS: only stations I follow"| P["Page in browser<br/>(Next.js on Vercel)"]
  R -->|"5 · Realtime INSERT<br/>fresh / stale / down"| P
  P -->|"6 · follow / unfollow<br/>Server Action + auth.protect()"| F[("follows<br/>user_id = Clerk sub")]
  K["Clerk"] -->|"7 · session token (sub)"| P
  F -. "RLS on station_status checks follows" .-> S
  I["Divvy GBFS<br/>station_information.json"] -. "8 · names, capacity<br/>(Next.js server, cached 60 s)" .-> P
```

## What each arrow sends, and what breaks if it changes

| # | From → to | What is sent | If it changed |
|---|---|---|---|
| 1 | Divvy → worker | `station_status.json`: per station `station_id`, `num_bikes_available`, `num_ebikes_available`, `num_docks_available`, `is_renting`, `is_returning`, `last_reported`; feed `last_updated`, `ttl` | Renamed fields or a new feed URL: the worker can't parse it, the run is logged `ok = false`, the page shows **down**. Counts stop updating but nothing wrong is saved. |
| 2 | Worker → `station_status` | Only stations whose counts or `is_renting`/`is_returning` differ from the last snapshot (kept in memory, loaded from the table on start). Never a row just because `last_reported` moved. | Comparing `last_reported` too: ~1,100 rewrites per run, and Realtime messages run out within days. Losing the in-memory snapshot without reloading it: every station gets rewritten on restart. |
| 3 | Worker → `runs` | One row per run, even when 0 rows changed or the run failed: `started_at`, `finished_at`, `ok`, `rows_changed`, `error`, `feed_last_updated` | If the worker skipped the row on failure or on 0 changes, the page couldn't tell "nothing changed" from "worker dead", and stale/down would be wrong. |
| 4 | `station_status` → page | Realtime `UPDATE` for a station, sent only if RLS lets this person read it (they follow it) | Without the publication, the `select` grant, or the RLS policy, Realtime sends nothing and shows no error. If Clerk isn't a third-party provider in Supabase, `auth.jwt()->>'sub'` is empty and nobody can read anything. |
| 5 | `runs` → page | Realtime `INSERT` for each new run | Without it, "checked 20 s ago" only updates when a followed station changes, so a quiet station looks stale. |
| 6 | Page → `follows` | `station_id`, `nickname`, `need` (bike / dock); `user_id` defaults to the token's `sub` | Unfollowing removes the station from RLS, so its updates stop reaching that person. Without RLS on `follows`, people could see each other's choices. |
| 7 | Clerk → page | Session token whose `sub` is the Clerk user id, passed to the Supabase client for queries and Realtime | Wrong or missing token: RLS returns no rows and Realtime delivers nothing. |
| 8 | Divvy → Next.js server | Station names and capacity, for search and labels (as in A4, `src/lib/gbfs.ts`) | Changes rarely. If it fails, search breaks but live counts still arrive. |

## Tables

| Table | One row is | Written by | Read by | Realtime |
|---|---|---|---|---|
| `station_status` | a station's latest counts | worker only (secret key bypasses RLS) | signed-in users, only stations they follow | yes |
| `runs` | one worker poll | worker only | any signed-in user | yes |
| `follows` | one person following one station (replaces A4's `saved_stations`; `departures` and `checks` dropped) | the person, with RLS | the person, with RLS | no |

Signed-in users have no write grants on `station_status` or `runs`. Signed-out visitors (`anon`) have no grants at all.

## Freshness states on the page

Based on the newest `runs` row (worker polls every 30 s):

- **Loading**: no data from Supabase yet.
- **Fresh**: the newest run worked and finished less than 2 minutes ago (about 3 missed runs).
- **Stale**: no successful run in the last 2 minutes, so the worker is slow or stopped.
- **Down**: the newest run failed (`ok = false`).

## Decisions

1. The worker saves **all** stations (~2k rows), so it never reads anyone's follows.
2. RLS on `station_status` allows reading **only stations you follow**, so Realtime sends each person only their stations.
3. `saved_stations` becomes `follows`; `departures` and `checks` are not carried over.
4. The worker polls **every 30 s**. Divvy updates about every 60 s, so about half the runs log 0 changes.
