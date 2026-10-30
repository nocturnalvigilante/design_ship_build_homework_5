# DockCheck Live

**Follow the Divvy stations you use, and watch their bikes and docks change without refreshing.**

Live: **https://design-ship-build-homework-5.vercel.app** (make an account with Google or email)

> I follow Ellis & 58th as "Lab" → a worker on Supabase polls Divvy and saves only what changed → my open page ticks from 3 bikes to 2 on its own, and tells me how fresh that is.

MPCS 51238 Design, Build, Ship, Assignment 5: Live Data System. Extends DockCheck (Assignment 4, a separate repo and Supabase project, untouched).

## What it does

- **Follow the stations you use**, with your own name for each ("Lab", "Home"), and whether you need a bike or a free dock there.
- **Counts update on their own.** A worker checks Divvy every 30 s and saves only the stations that changed; Supabase Realtime pushes those changes to your open page. A count that changes lights up for a moment.
- **You always know how fresh it is:** "Live · checked 12 s ago", or a clear warning when it isn't.
- **Your follows are yours:** nobody else can see them, and Realtime only sends you the stations you follow.

## Data flow

The chart was drawn and committed before any worker or Realtime code: [`docs/data-flow.md`](docs/data-flow.md).

```
Supabase Cron ──POST every 30 s──▶ worker (Edge Function poll-divvy)
   worker ──GET──▶ Divvy station_status.json
   worker ──upsert only changed stations──▶ station_status   (secret key)
   worker ──1 row every run, even on failure──▶ runs
   station_status ──Realtime, RLS: only stations you follow──▶ page
   runs ──Realtime──▶ page (fresh / stale / down)
   page ──follow / unfollow (Server Action)──▶ follows (your rows, RLS)
```

## Design process

- **Same main task as A4, now live.** A4 answered "is there a bike?" when you opened the page. A5 keeps answering while the page stays open, so you can watch for the bike to come back.
- **Glanceable, unchanged from A4.** One big number per station, red at 0 and green otherwise; e-bike / classic split underneath.
- **Live data has its own states**, all based on the newest worker run:

  | State | When | What you see |
  |---|---|---|
  | Loading | before Realtime connects | grey pulsing dot, "Connecting to live updates…" |
  | Fresh | newest run worked, under 2 min ago | green dot, "Live · checked 12 s ago" |
  | Stale | no run for 2 min (about 3 missed runs) | amber box "Updates have paused", counts dimmed |
  | Down | newest run failed (Divvy unreachable) | red box "Can't reach Divvy right now. Counts below are from 3:42 AM", counts dimmed |

  Stale and down are deliberately different: stale means the worker stopped reporting, down means the worker is fine but Divvy isn't. Counts stay visible but dimmed in both, because an old number is still useful if it's labelled as old.
- **Changes are noticeable, not noisy.** A changed count gets a 1.5 s highlight (an outline instead with reduced motion). "Checked … ago" ticks every 5 s without announcing itself to screen readers; the stale and down boxes do (`role="status"`).
- **Other states from A4 kept:** empty ("You're not following any stations yet"), search loading / nothing found / Divvy down, a station not renting, a station Divvy no longer lists.
- **Mobile-first:** a single column up to 32rem, touch targets at least 44 px, labelled form fields, dark mode, times in Chicago time.

## Stack

| Part | Choice |
|---|---|
| App | Next.js 15 (App Router), Tailwind CSS 4, on Vercel Hobby |
| Sign-in | Clerk (development keys, app "DockCheck Live") |
| Data + live updates | Supabase Postgres + Realtime (project `dockcheck-live`) |
| Worker | Supabase Edge Function (TypeScript on Deno) in [`supabase/functions/poll-divvy/`](supabase/functions/poll-divvy/), called by Supabase Cron every 30 s, no packages |
| Source | [Divvy GBFS](https://gbfs.lyft.com/gbfs/1.1/chi/en/gbfs.json) `station_status` (no key, new snapshot every ~60 s) |
| Tests | `node --test` for the worker logic, Playwright + `@clerk/testing` for the page |

## How it works

- **The worker** ([`supabase/functions/poll-divvy/index.ts`](supabase/functions/poll-divvy/index.ts)) is an Edge Function. Supabase Cron ([`supabase/migrations/20261029120000_poll_divvy_cron.sql`](supabase/migrations/20261029120000_poll_divvy_cron.sql)) calls it every 30 s with a secret key from Vault; without one it answers 401. Each call fetches `station_status.json` (8 s timeout), compares each station with the counts already saved in `station_status`, and upserts only stations whose bikes, e-bikes, docks, `is_renting` or `is_returning` changed. A new `last_reported` alone doesn't count: ~1,100 stations check in every few minutes with the same counts. The saved counts are read on every call, because an Edge Function keeps nothing between calls. Every run adds one row to `runs`, even when nothing changed or Divvy failed. It writes with the Supabase **secret key**, which Supabase gives the function on its own servers. About half the runs save 0 rows, since Divvy publishes about every 60 s ([first runs](docs/evidence/edge-worker-runs.md)).
- **The page** ([`src/app/page.tsx`](src/app/page.tsx)) renders your follows and their current counts on the server, as you (your Clerk token, publishable key). Then [`live-stations.tsx`](src/app/live-stations.tsx) subscribes to Realtime changes on `station_status` (your stations) and new `runs`, and catches up whenever it (re)connects.
- **Who you are:** Clerk's middleware reads your session; every page, route and Server Action starts with `await auth.protect()`. Supabase trusts Clerk as a third-party auth provider, so RLS sees your Clerk id in `auth.jwt()->>'sub'`.
- **Station names** for search and labels come from Divvy's `station_information.json`, fetched on the server and cached for 60 s.

### Data model

Created by [`supabase/migrations/20261028065844_live_tables.sql`](supabase/migrations/20261028065844_live_tables.sql).

| Table | One row is | Written by | Read by | Realtime |
|---|---|---|---|---|
| `follows` | you following one station: `station_id`, `nickname`, `need` | you (RLS) | you (RLS) | no |
| `station_status` | a station's latest counts | the worker only | signed-in users, **only stations they follow** (RLS) | yes |
| `runs` | one worker run: `started_at`, `finished_at`, `ok`, `rows_changed`, `error` | the worker only | any signed-in user | yes |

Realtime only sends a change when all three are in place: the table is in the `supabase_realtime` publication, `authenticated` has `select`, and an RLS policy lets that person read the row.

## Tests

```bash
npm run test:worker          # worker logic on two saved Divvy responses
npx playwright test          # page, against a local production build
BASE_URL=https://design-ship-build-homework-5.vercel.app npx playwright test   # against the live site
```

- [`supabase/functions/poll-divvy/stations.test.ts`](supabase/functions/poll-divvy/stations.test.ts): runs the worker's parsing and "what changed" logic on two real responses saved 3 min apart ([`docs/evidence/`](docs/evidence/)). Checks: 2,076 stations parsed; exactly 28 changed; `last_reported`-only and disabled-only changes ignored; the same response twice saves nothing; an empty table saves everything; a non-GBFS response is rejected.
- [`e2e/isolation.spec.ts`](e2e/isolation.spec.ts): two users each follow a station; neither can see the other's.
- [`e2e/states.spec.ts`](e2e/states.spec.ts): empty, nothing found, and the live line reaching "Live · checked".
- [`e2e/freshness.spec.ts`](e2e/freshness.spec.ts): the loading / fresh / stale / down rules.

## Run it locally

```bash
npm install
# create .env.local yourself: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY,
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

The worker already runs on Supabase, so a local page shows live data straight away. To see the **down** state on purpose, set the Edge Function secret `FEED_URL` to a broken URL (Edge Functions → Secrets); delete it to recover. To see **stale**, pause the cron job for 2 minutes: `select cron.alter_job((select jobid from cron.job where jobname = 'poll-divvy'), active := false);` (and `true` to resume).

## Security

- Keys live only in `.env.local` (git-ignored), Vercel's variables and Supabase (Vault for the cron key; the function's own `SUPABASE_SECRET_KEYS`). `.claude/settings.json` denies the agent reading any `.env` file.
- The Supabase secret key is used only by the worker. The browser only ever gets publishable keys and the user's own Clerk token.

Agent context: [`AGENTS.md`](AGENTS.md). Requirement-by-requirement status: [`CHECKLIST.md`](CHECKLIST.md). What I learned at each step: [`docs/learning.md`](docs/learning.md).
