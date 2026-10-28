# AGENTS.md

Context for any coding agent working in this repo. MPCS 51238 Design, Build, Ship, Assignment 4: "Full Stack App". Due Tuesday 27 October 2026, 5:30 PM. `CHECKLIST.md` lists every requirement from the brief; tick an item only once it has been verified.

## What this is

**DockCheck** (working name) answers one question for a UChicago student: *will there be a Divvy bike (or a free dock) at my station when I leave?* You save the stations you use, like "Lab" (Ellis & 58th) or "Home", and the times you usually leave. The app shows live bikes and docks for exactly those stations and learns from your own checks when they usually run empty.

Main task, as one sentence:

> I save Ellis & 58th as "Lab" → at 5:40 it tells me 2 bikes left, both e-bikes → I sign in on my phone tomorrow, and my stations and times are still there.

## Stack (from the brief)

- Next.js (App Router), Tailwind CSS, **Clerk** for sign-in (development keys only), **Supabase** for data, and **one external API: Divvy GBFS**.
- Free tiers only. No new npm packages without asking.
- Deployed on Vercel Hobby from our own GitHub repo. Work on a branch, and run `/security-review` before merging.

## Keys

- Keys live in `.env.local` only, never in code or commits. `.claude/settings.json` denies the agent `Read(./.env)` and `Read(./.env.*)`.
- **The user creates and edits `.env.local`. The agent never does.**
- Publishable keys (`NEXT_PUBLIC_…`) may reach the browser. Secret keys (Clerk secret, any Supabase service key) stay on the server only.

## Sign-in (Clerk)

- `src/middleware.ts` is plain `clerkMiddleware()`: it identifies the user but protects nothing. Clerk has deprecated `createRouteMatcher`, so there is no route list.
- **Every page, Route Handler and Server Action that shows or changes someone's data starts with `await auth.protect()`** (from `@clerk/nextjs/server`). Only `/sign-in` and `/sign-up` are public.

## External API: Divvy GBFS (no key)

- Stations: `https://gbfs.lyft.com/gbfs/1.1/chi/en/station_information.json`. About 2,074 stations: `station_id`, `name`, `lat`, `lon`, `capacity`.
- Live status: `https://gbfs.lyft.com/gbfs/1.1/chi/en/station_status.json`. Fields: `num_bikes_available`, `num_ebikes_available`, `num_bikes_disabled`, `num_docks_available`, `is_renting`, `is_returning`, `last_reported`; feed-level `last_updated`, `ttl` = 60 s.
- **Where it's called: on our server** (a Route Handler, with responses cached for 60 s to match `ttl`). The reason is size and caching, not keys: the feeds are large (2,000+ stations), and one cached server fetch serves every user instead of each phone downloading the whole city.
- **Designed states:**
  - **Loading:** skeleton cards.
  - **Nothing found:** no station matches the search, or a saved `station_id` no longer exists, because GBFS just omits it rather than returning an error.
  - **API down:** a non-200 response, a timeout, or a stale `last_updated` (older than 5 min). Show the last known counts, labelled with their time.

## Data model (agreed with the user, 2026-10-21)

Every table holds one person's data, has a `user_id` column (the Clerk user id, from `auth.jwt()->>'sub'`), and has **row-level security** so each user can select, insert, update and delete only rows where `user_id` matches them. Tables are created as Supabase migrations.

| Table | Holds | Columns |
|---|---|---|
| `saved_stations` | the stations you use | `id`, `user_id`, `station_id` (GBFS), `nickname` ("Lab"), `need` (`bike` \| `dock`), `created_at` |
| `departures` | when you usually leave from a saved station | `id`, `user_id`, `saved_station_id` → `saved_stations.id`, `weekdays` (int[]), `leave_at` (time), `created_at` |
| `checks` | each time you looked: what was there | `id`, `user_id`, `station_id`, `bikes`, `ebikes`, `docks`, `checked_at` |

`checks` is what powers "usually empty by 5:40 on weekdays", built from your own history only.

## Working here

- The cluster's `fe01` is a login node. Run installs and builds on `fe02` (`ssh rajhansini@fe02.ai.cs.uchicago.edu`), with Node 22 from `~/.local/node/bin`.
- `npm run dev`, `npm run build`, `npm run lint`. End-to-end tests use Playwright.
- Small commits, one change each, with messages that say what changed and why.
