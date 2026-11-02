# DockCheck Live

**Know before you walk to the bike station.** DockCheck Live tells a Divvy rider, as they leave, whether their station has a bike (or a free dock) waiting, and if not, where to go instead.

Live: **https://design-ship-build-homework-5.vercel.app** (make an account with Google or email)

MPCS 51238 Design, Build, Ship, Assignment 5: Live Data System. Extends DockCheck (Assignment 4, a separate repo and Supabase project, untouched).

## Why

**Who it's for.** A UChicago student who rides Divvy between the same few places: the lab, home, the gym.

**The problem.** Divvy stations run out. You walk five minutes to Ellis & 55th and there are no bikes; or you ride to class and the station is full, so you circle looking for a dock. You find out too late, when you're already standing there.

**The one question it answers:** *"Should I walk to my station right now, or go somewhere else?"*

**Why not a spreadsheet (or the Divvy map)?** A spreadsheet can list your stations; it can't tell you what's there *now*. The Divvy app shows every station in the city; you have to find yours and work out what to do. DockCheck Live does three things neither does:

1. **It's live.** Counts change on your screen as bikes leave and arrive, without refreshing.
2. **It tells you what to do.** Each of your stations says *Go*, *Go now: only a few left*, or *Empty: don't walk over*, and when it's empty it names the nearest station that has bikes, with the walk time and directions.
3. **It's honest about freshness.** "Live · checked 12 s ago", or a clear warning when updates stop, so you never trust an old number.

**The core loop.** Follow the station you leave from once (search, or click it on the map). Then open DockCheck just before you head out, glance at the verdict, and go. A full walk-through from the rider's side: [`docs/user-journey.md`](docs/user-journey.md).

> I follow Ellis & 58th as "Lab" → a worker on Supabase polls Divvy and saves only what changed → my open page ticks from 3 bikes to 2 on its own, tells me how fresh that is, and if Lab empties, where to go instead.

## What it does

- **Follow the stations you use**, with your own name for each ("Lab", "Home", or leave it blank), and whether you need a bike or a free dock there. Search by street or click a station on the map.
- **Each station gives a verdict:** Go (3 or more), Go now (1–2, may be gone by the time you arrive), Empty / Full, or Closed.
- **When your station can't help, it says where to go instead:** the nearest station within 1.5 km with more than two left, its walking minutes, and a Directions link.
- **Counts update on their own.** A worker checks Divvy every 30 s and saves only the stations that changed; Supabase Realtime pushes those changes to your open page. A count that changes lights up for a moment.
- **A map** of your stations with their live counts, and the stations around them.
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
- **A verdict before the number.** Feedback on A4 (a grader's video, `docs/evidence/a4-grader-feedback.md`, and the instructor: "what is the value? … how would this be different than a spreadsheet?") said a number alone doesn't tell you what to do. So each card leads with one line, Go / Go now / Empty / Closed, coloured green / amber / red, then the big number, then e-bike / classic. The thresholds live in `src/lib/advice.ts` and are unit-tested (`npm run test:advice`).
- **Never a dead end.** An empty, closed or nearly-empty station shows "Try instead" with the nearest station that has more than two left. Its count is labelled "when you opened the page", because it comes from Divvy's public feed at page load, not from Realtime.
- **Say what it is and why before asking anything.** Signed-out visitors get a landing page: the rider's problem, an example of the moment it matters (an empty station and where to go instead), why it's more than a list, and one main button, "Follow your station".
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
- **Map beside the list.** The grader asked twice for a map. Your stations are pins with their live count; nearby stations are dots you can click to follow. Leaflet with OpenStreetMap tiles, no API key.
- **Mobile-first:** a single column on phones (a 2–3 column grid on desktop), touch targets at least 44 px, labelled form fields, dark mode, times in Chicago time.

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
npm run test:advice          # verdict and "try instead" logic
npx playwright test          # page, against a local production build
BASE_URL=https://design-ship-build-homework-5.vercel.app npx playwright test   # against the live site
```

- [`supabase/functions/poll-divvy/stations.test.ts`](supabase/functions/poll-divvy/stations.test.ts): runs the worker's parsing and "what changed" logic on two real responses saved 3 min apart ([`docs/evidence/`](docs/evidence/)). Checks: 2,076 stations parsed; exactly 28 changed; `last_reported`-only and disabled-only changes ignored; the same response twice saves nothing; an empty table saves everything; a non-GBFS response is rejected.
- [`e2e/isolation.spec.ts`](e2e/isolation.spec.ts): two users each follow a station; neither can see the other's.
- [`e2e/states.spec.ts`](e2e/states.spec.ts): empty, nothing found, and the live line reaching "Live · checked".
- [`e2e/freshness.spec.ts`](e2e/freshness.spec.ts): the loading / fresh / stale / down rules.
- [`src/lib/advice.test.ts`](src/lib/advice.test.ts): Go / Go now / Empty / Closed thresholds; the nearest alternative skips low, unknown, too-far and same stations, and uses docks when you need a dock.
- [`e2e/value.spec.ts`](e2e/value.spec.ts): the landing page leads with the problem and one action; each followed station shows a verdict.
- [`e2e/map.spec.ts`](e2e/map.spec.ts), [`e2e/feedback.spec.ts`](e2e/feedback.spec.ts): map pins and dot-to-follow, optional nickname, desktop grid.

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
