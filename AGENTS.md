# AGENTS.md

Context for any coding agent working in this repo. MPCS 51238 Design, Build, Ship, Assignment 5: "Live Data System". Due Tuesday 3 November 2026, 5:30 PM. `CHECKLIST.md` lists every requirement from the brief; tick an item only once it has been verified. A one-shot submission is marked incomplete: work step by step, with the user, in small commits.

## What this is

**DockCheck Live** extends DockCheck (Assignment 4, a separate repo that must stay untouched). A UChicago student follows the Divvy stations they use, like "Lab" (Ellis & 58th), and watches bikes and docks change **without refreshing**.

Main task, as one sentence:

> I follow Ellis & 58th as "Lab" → a worker on Railway polls Divvy and saves only what changed → my open page ticks from 3 bikes to 2 on its own, and tells me how fresh that is.

## Stack (from the brief)

- Next.js (App Router), Tailwind CSS, **Clerk** (development keys, app "DockCheck Live", not A4's app), **Supabase** for data **and Realtime** (project `dockcheck-live`, ref `ecpppyiclszsuyeeccyl`), **Railway** for the worker.
- The worker is a small Node.js program in **`worker/`**, listed in `tsconfig.json` `exclude`. Railway's root directory is `worker/`.
- Free tiers only. No new npm packages without asking. Work on a branch, and run `/security-review` before merging.

## Keys

- `.claude/settings.json` denies the agent `Read(./.env)` and `Read(./.env.*)`. **The user creates and edits `.env.local`. The agent never does.** The same goes for Railway and Vercel variables: the user pastes the values.
- Publishable keys (`NEXT_PUBLIC_…`) may reach the browser. The Clerk secret key stays on the Vercel server. The **Supabase secret key is used only by the worker**, from Railway's variables, never in code or the browser.

## Sign-in (Clerk)

- `src/middleware.ts` is plain `clerkMiddleware()`. **Every page, Route Handler and Server Action that shows or changes someone's data starts with `await auth.protect()`.** Only `/sign-in` and `/sign-up` are public.

## Source: Divvy GBFS (no key)

- `station_information.json` (names, lat/lon, capacity; rarely changes) and `station_status.json` (counts; new snapshot about every 60 s, `ttl` 60).
- Called twice 3 min apart (2026-10-28): 30 of 2,076 stations changed counts, but 1,116 had a new `last_reported`. **"Changed" means counts or `is_renting`/`is_returning` changed, never just `last_reported`,** or every run rewrites ~1,100 rows and burns Realtime messages.

## Data flow and data model

**To be planned with the user in step 3, as a chart committed before any worker or Realtime code.** Constraints from the brief: the worker upserts only changed rows; a `runs` table records every run (when, ok or not, rows changed); each person's follows are their own rows with a `user_id` (Clerk id, `auth.jwt()->>'sub'`) and RLS; Realtime needs the table in the publication, a grant, and an RLS policy that lets the person read it. Tables are created as Supabase migrations. The A4 migrations in `supabase/migrations/` belong to A4's project and are not applied here as-is.

## Working here

- The cluster's `fe01` is a login node. Run installs and builds on `fe02`, with Node 22 from `~/.local/node/bin`.
- `npm run dev`, `npm run build`, `npm run lint`. End-to-end tests use Playwright.
- Small commits, one change each, with messages that say what changed and why.
- Railway sign-ups were disabled on 2026-10-28 (Railway's outage). Build and test the worker locally first; deploy when sign-up works. Don't pay, and tell the teaching staff if it stays blocked.
