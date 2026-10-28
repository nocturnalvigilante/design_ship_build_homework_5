# DockCheck

**Will there be a Divvy bike, or a free dock, at my station when I leave?**

Live: **https://dockcheck-phi.vercel.app** (make an account with Google or email)

> I save Ellis & 58th as "Lab" → at 5:40 it tells me 2 bikes left, both e-bikes → I sign in on my phone tomorrow, and my stations and times are still there.

MPCS 51238 Design, Build, Ship, Assignment 4: Full Stack App.

## What it does

- **Save the stations you use**, with your own name for each ("Lab", "Home"), and whether you need a bike or a free dock there.
- **See live counts for exactly those stations:** the big number is what you need (bikes or docks), with the e-bike / classic split underneath.
- **Add when you usually leave** ("Mon–Fri at 5:40 PM"). Each time you open the app it records what was there, and over time each departure shows *"Empty 3 of 5 times you checked around then"*, from **your own** history only.
- **Your data is yours:** sign in on any device and it's there; nobody else can see it.

## Design process

- **Explored first.** I started from a gym-crowd idea, but UChicago publishes no occupancy feed. Divvy's live feed answers a question students have every day, and it's distinct from the usual weather / Pokémon apps.
- **One main task, written down before building** (the quote above, in `AGENTS.md`). Every screen serves it: no map, no city-wide browsing, just *your* stations.
- **Glanceable.** One big number per station, red at 0 and green otherwise. The detail is underneath for when you want it.
- **Every state designed:**
  - empty ("No stations yet" with a hint)
  - loading (skeleton cards)
  - nothing found (search with no match, or a station Divvy dropped)
  - Divvy down (last known counts with their time)
  - stale data
  - a station that's not renting
- **Mobile-first:** a single column up to 32rem, touch targets at least 44 px, labelled form fields, dark mode, times always in Chicago time.

## Stack

| Part | Choice |
|---|---|
| App | Next.js 15 (App Router), Tailwind CSS 4 |
| Sign-in | Clerk (development keys) |
| Data | Supabase Postgres, row-level security on every table |
| External API | [Divvy GBFS](https://gbfs.lyft.com/gbfs/1.1/chi/en/gbfs.json) (no key) |
| Hosting | Vercel Hobby |
| Test | Playwright + `@clerk/testing` |

## How it works

- **Who you are:** Clerk's middleware reads your session on every request, and every page, route and server action starts with `await auth.protect()`.
- **What you may see:** decided in **Supabase**. The server talks to Supabase *as you*, sending your Clerk token (`src/lib/supabase.ts`, publishable key only). Supabase trusts Clerk through third-party auth, and RLS only returns rows where `user_id = auth.jwt()->>'sub'`. Signed-out visitors have no access to any table.
- **Where Divvy is called:** on the **server** (`src/lib/gbfs.ts`), cached for 60 s to match the feed's `ttl`. The two feeds are about 1.9 MB, so one cached fetch serves everyone, instead of each phone downloading the whole city. `/api/stations` (search) and `/api/status` (live counts) are behind sign-in.

Diagrams and plain-words explanations of all of this are in [`docs/learning.md`](docs/learning.md).

### Data model

| Table | Holds |
|---|---|
| `saved_stations` | your stations: `station_id` (GBFS), `nickname`, `need` (bike/dock) |
| `departures` | when you leave from a saved station: `weekdays`, `leave_at` |
| `checks` | what was there each time you looked: `bikes`, `ebikes`, `docks`, `checked_at` |

Each has `user_id` and RLS. Created as migrations in [`supabase/migrations/`](supabase/migrations/).

## Tests

```bash
npx playwright test                       # starts the dev server on :3000
BASE_URL=https://dockcheck-phi.vercel.app npx playwright test   # or test the live site
```

- `e2e/isolation.spec.ts`: two users sign in, each saves a station, and neither can see the other's. **Watched failing first:** with RLS broken on purpose (`e2e/break-rls.sql`) it failed with *"user B can see user A's station"*. After `e2e/fix-rls.sql` it passed. Output in [`docs/evidence/`](docs/evidence/).
- `e2e/states.spec.ts`: "nothing found" and "Divvy down" (`/?demo=api-down`) both show their designed state.

Needs Clerk keys in `.env.local`. The test users are `+clerk_test` addresses in the development instance.

## Security

- Keys live only in `.env.local` (git-ignored) and Vercel's environment variables. `.claude/settings.json` denies the agent `Read(./.env)` and `Read(./.env.*)`, committed before any key existed.
- `/security-review` ran on each branch before merging: [`docs/security-review.md`](docs/security-review.md).

## Run it locally

```bash
npm install
# create .env.local yourself with: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY,
# NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in, NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up,
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Agent context for this repo is in [`AGENTS.md`](AGENTS.md); the requirement-by-requirement checklist is [`CHECKLIST.md`](CHECKLIST.md).
