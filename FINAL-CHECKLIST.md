# Final checklist (from 1 Nov 2026 to the deadline)

Due **Tue 3 Nov 2026, 5:30 PM**. This replaces the open items in `CHECKLIST.md`; that file stays as the record of what was verified.

**Why a fresh list:** the instructor's feedback (below) says the work is simple but doesn't show *why anyone would use it*. That is now the biggest risk, ahead of any technical item.

> "What's the core value prop … What are you asking users to do? And why? … how would this be different than just entering them in a spreadsheet? … we always want to be user-focused."

Owner: **C** = Claude does it, **You** = only you can do it. Tick only once verified.

## 1. Value and communication (the instructor's feedback) — C

The answer to "why not a spreadsheet?": a spreadsheet can list your stations, but it can't tell you **right now** whether there's a bike waiting, warn you when that information is old, or point you to the nearest station that does have one. DockCheck Live answers one question at the moment you leave: **"Should I walk to my station, or go somewhere else?"**

| # | Item | Owner | Done |
|---|---|---|---|
| V1 | **Landing page leads with the problem and the promise**: the problem (walk to an empty station, or arrive with nowhere to dock), what you get, and one clear action | C | ☑ |
| V2 | **Each card gives a verdict, not just a number**: "Go: 5 bikes", "Low: 1 bike, go now", "Empty" | C | ☑ |
| V3 | **When your station is empty, say where to go instead**: the nearest station with bikes (or docks), with walking minutes and a Directions link. This is what a spreadsheet can't do. | C | ☑ |
| V4 | **README opens with "Why"**: who it's for, the problem, the one question it answers, why not a spreadsheet, the core loop | C | ☑ |
| V5 | **User journey from the user's perspective** (`docs/user-journey.md`): a student leaving the lab at 5:40, step by step, with screenshots | C | ☑ |
| V6 | **Design write-up for the live states** (loading, fresh, stale, down, the tick on a change) in the README (old C7) | C | ☑ |
| V7 | Tests for V1–V3, run against the live site; screenshots in `docs/evidence/` | C | ☑ |

## 2. Brief items still open

| # | Item | Owner | Done |
|---|---|---|---|
| K1 | **Rotate the Clerk secret key** (shown in a screenshot): Clerk → API keys → new key → `.env.local` → Vercel env var → Redeploy → delete the old key | You | ☐ |
| K2 | **Rotate the Supabase secret key in Vault** (pasted in chat): make a new secret key, then in the SQL editor `select vault.update_secret((select id from vault.secrets where name = 'cron_secret_key'), 'NEW');`, then delete the old key | You | ☐ |
| E1–E3 | **Free plans, no card, spend cap**: Vercel → Settings → Billing says Hobby; Supabase → Org → Billing says Free, Spend cap on; Clerk → Billing says Free. Send a screenshot of each | You | ☐ |
| E4 | Edge Function calls: every 30 s ≈ 86,400 a month of 500,000 | C (verified in `docs/learning.md`) | ☑ |
| E6 | Open the live site once every few days until grades are back, so Supabase doesn't pause | You | ☐ |
| B2 | **Clerk CLI** is listed in the brief and not installed. Say yes and Claude installs it and checks it works | You → C | ☐ |
| D6 / G2 | Code in your own GitHub repo, README, commit history showing progress (60 commits since 28 Oct) | C (verified) | ☑ |
| A7 | Not one-shot: 60 small commits across 5 days, each with a reason | C (verified) | ☑ |

## 3. Be ready to explain (A6, F1–F4) — You

Read `docs/learning.md` §3–§6 and say each answer out loud once, without notes:

| # | Topic | Done |
|---|---|---|
| F1 | Trace a bike taken from "Lab" to your screen (§5, quiz Q1) | ☐ |
| F2 | What counts as "changed", and what breaks if `last_reported` counted (§3, quiz Q2) | ☐ |
| F3 | Fresh vs stale vs down, and where "checked 20 s ago" comes from (quiz Q3) | ☐ |
| F4 | What `npm run test:worker` checks, and what the last three runs showed (§4, quiz Q4) | ☐ |
| V | **The value in one sentence**: "It tells you, right as you leave, whether to walk to your station or where to go instead, and how fresh that is." | ☐ |

## 4. Submit — You

| # | Item | Done |
|---|---|---|
| S1 | Google Classroom: https://design-ship-build-homework-5.vercel.app | ☐ |
| S2 | Google Classroom: https://github.com/nocturnalvigilante/design_ship_build_homework_5 | ☐ |
