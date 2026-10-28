# Assignment 5 grading checklist: Live Data System

Every item is taken from the brief. An item is ticked only once it has been **verified**, not just written. Due **Tuesday 3 November 2026, 5:30 PM**.

## A. Assessment ("A complete assignment has")

| # | Requirement | Evidence | Status |
|---|---|---|---|
| A1 | A live Vercel URL where a classmate can sign in and **watch the data update without refreshing** | | ☐ |
| A2 | A worker that runs all the time on Railway, **recording each run in a table** | | ☐ |
| A3 | A high-level chart of the data flow | `docs/data-flow.md`, commit `f3c5018` | ☑ |
| A4 | Freshness shown on the page, with a **designed stale state** | Fresh, stale and down captured from the real page: `docs/evidence/live-states.md` | ☑ |
| A5 | A GitHub repo with commits that show progress | `main` pushed 2026-10-28: chart → migration → worker → tests → page → evidence, one change per commit | ☑ |
| A6 | Ready to explain the work in class (section F) | | ☐ |
| A7 | **Not one-shot:** built step by step, not by handing the brief to an agent once | | ☐ |

## B. Steps, each with its "Ask your agent" prompt

| # | Step | Ask-your-agent done? | Status |
|---|---|---|---|
| B1 | **Choose a live source** that changes on its own while people watch (extend A4 or start new). The agent **calls it twice, a few minutes apart, and shows what changed** | ☑ "Explain this response…" (docs/learning.md §1) | ☑ 2026-10-28: extend DockCheck with Divvy GBFS; called twice 3 min apart: 30 of 2,076 stations changed counts, 1,116 only re-checked in (`docs/evidence/source-called-twice.txt`) |
| B2 | **Give the agent access:** Supabase MCP scoped to the project (tables, Realtime, database logs); **Railway CLI** installed + `railway login` (agent deploys the worker and reads `railway logs`); **Clerk CLI** `clerk`; Vercel deploys on push to GitHub | ☐ "List the MCP servers and CLIs you can use in this project, and what you'd use each one for. Then check that each one works." | ☐ |
| B3 | **Plan the data flow** source → worker → database → page; Claude draws it as a high-level chart **before any code is written** | ☐ "Walk me through the chart: what each part sends to the next, and what would break if one part changed it." | ☐ |
| B4 | **Build the worker:** small Node.js program in **its own folder**; runs all the time on Railway; polls every few seconds (or slower if the source is slow or rate-limited); saves **only changed rows with an upsert**; writes with the Supabase **secret key, kept in Railway variables, never in code**; adds a row to a **runs table** each run (when, worked?, rows changed); **run locally first and watch rows change**; then deploy to Railway **from the GitHub repo**; agent sets up a **test that runs the worker on a saved copy of the source's response** and checks what it saves, and **you understand what it checks** | ☐ "Show me the worker's logs from its last three runs, and explain each line." | ☐ |
| B5 | **Make the page live:** updates without refresh via **Supabase Realtime**; all three of: **table added to Realtime publication**, **read access granted**, **RLS policy that lets the person read it**; each person **chooses what they follow** and sees only their own choices; shows **how fresh** the data is; designed states: **loading, fresh, stale** (older than a few missed runs), **down** (worker's last run failed) | ☐ "Trace one update for me, from the source to my screen, and name every part it passes through." | ☐ |
| B6 | **Deploy and test:** worker on Railway, page on Vercel, env vars set in each; **a classmate signs in, chooses what they follow, and watches it update** | ☐ "Quiz me on how my system works, one question at a time, and tell me what I got wrong. Start with the questions in Be Ready to Explain." | ☐ |

## C. Requirements

| # | Requirement | Status |
|---|---|---|
| C1 | **Live source:** data from one source that changes on its own | ☑ Divvy station_status, new snapshot every ~60 s, 30 stations changed in 3 min at midnight |
| C2 | **Data flow:** a high-level chart of how data moves, **made before the code** (commit order proves it) | ☑ `f3c5018` chart, then `71254be` migration, `f519a09` worker, `8baa758` Realtime |
| C3 | **Worker:** runs all the time on Railway, saves **only what changed**, records each run in a table | ☐ |
| C4 | **Live page:** updates without a refresh, shows freshness, has **loading, stale and down** states | ☑ locally: live tick on video, stale and down screenshots (`docs/evidence/live-states.md`); still to repeat on Vercel |
| C5 | **Personal:** each person chooses what they follow, with **RLS on their choices** | ☑ `e2e/isolation.spec.ts` passes: two users, neither sees the other's follows |
| C6 | **Deployed:** page on Vercel and worker on Railway; a classmate can sign in and watch it update | ☐ |
| C7 | **UI/UX:** design process, principles and flows from earlier weeks still applied; live data has clear states | ☐ |

## D. Tech stack

| # | Requirement | Status |
|---|---|---|
| D1 | Next.js and Tailwind CSS | ☑ `npm run build` passes |
| D2 | Clerk for sign-in | ☑ signed in locally with app DockCheck Live (dev keys) |
| D3 | Supabase for the database **and Realtime** | ☑ page showed "Live · checked 13 s ago" from a Realtime runs insert |
| D4 | Railway for the worker, a small Node.js program that runs all the time | ☐ |
| D5 | Worker in **its own folder** in the app's repo, and that folder in **`tsconfig.json` `exclude`** (or the Next.js build fails) | ☑ `worker/`, excluded in `0a20097`, build passes |
| D6 | Code in our own GitHub repo | ☐ |
| D7 | Page on Vercel's free Hobby plan | ☐ |
| D8 | Worker on Railway with **root directory set to the worker's folder** | ☐ |
| D9 | `AGENTS.md` is the context file; any `CLAUDE.md` merged and deleted; **`/context` shows `AGENTS.md` loaded** | ☐ |

## E. Free tiers and usage limits

| # | Item | Status |
|---|---|---|
| E1 | Stay on the free tier for every service (Vercel, Supabase, Clerk, Railway) | ☐ |
| E2 | Set usage limits and spending alerts wherever offered | ☐ |
| E3 | No payment method unless required; if required, set a spending cap first | ☐ |
| E4 | **Railway:** sign up **with GitHub** so the account is verified (unverified = restricted outbound network, the worker may not reach Divvy). If restricted, **tell the teaching staff before paying** | ☐ |
| E5 | **Realtime messages:** save only what changed, so the worker doesn't burn a month of messages in hours | ☑ worker test + local logs: 2,076 once, then 0–20 per run (`docs/evidence/worker-local-run.txt`) |
| E6 | Supabase pauses after a week without use: open the app now and then until grades are back | ☐ |
| E7 | Ask your agent: "Walk me through the free tier limits for each service my app uses, and how to set usage limits and spending alerts for each one." | ☐ |

## F. Be ready to explain

| # | Question | Status |
|---|---|---|
| F1 | **Tracing a data change:** when the source changes, what happens in the worker, in Supabase, and on someone's screen | ☐ |
| F2 | **The data flow:** how data moves from source to page, and what would break if one part changed | ☐ |
| F3 | **Freshness:** how someone knows the data is current | ☐ |
| F4 | **Agentic workflow:** what the agent's tests check, and what you found in the logs | ☐ |

## G. Submission (Google Classroom)

| # | Item | Status |
|---|---|---|
| G1 | Vercel URL: a live link to the app | ☐ |
| G2 | GitHub URL: repo with `README.md` and a commit history that shows progress | ☐ |

## Easy-to-miss items (each one costs marks if skipped)

- The **chart comes before any worker or Realtime code**. Commit it first, so the history proves it.
- Call the source **twice, a few minutes apart**, and save what changed as evidence.
- **Only changed rows** are upserted, and each run is logged in a **runs table** even when nothing changed or it failed.
- The worker uses the Supabase **secret key** from **Railway variables**. It is never in code, never in the browser, never in a commit.
- Realtime silently sends nothing unless **all three** are in place: publication, grant, RLS policy.
- **Stale** and **down** are different states: stale = no successful run for a few intervals; down = the last run failed.
- The worker folder goes in **`tsconfig.json` `exclude`**, and Railway's **root directory** is that folder.
- Run the worker **locally first**, then deploy **from GitHub**.
- The worker **test runs on a saved copy** of the Divvy response (a fixture), not the live feed.
- A real **classmate** signs in, **chooses** a station, and **watches it update without refreshing**.
- Keep A4's repo, Vercel project and Supabase project untouched: A5 is a separate repo and project.

## Open items, audited 2026-10-28 (read as a grader looking for reasons to fail)

Blockers: each one alone makes the submission incomplete.

1. ~~**Nothing is pushed.**~~ **Fixed**: merged and pushed to `main` after a clean `/security-review`. 8+ commits exist only on the local branch `step3-data-flow`. GitHub `main` still ends at step 1. (A5, G2)
2. ~~**README.md is still A4's.**~~ **Fixed** `d5f90a6`; the Vercel URL is a placeholder until deploy. It links the **A4 Vercel URL** and describes saved times and history. A grader following it lands on the wrong app. (G2)
3. **No Vercel deployment** for A5, so no URL. (A1, C6, D7, G1)
4. **Worker isn't on Railway.** Sign-up is blocked; it only runs on fe02 while this session is open. Tell the teaching staff in writing if it's still blocked. (A2, C3, D4, D8, E4)
5. **No classmate test.** Someone else must sign in, follow a station and watch it change. (A1, B6, C6)
6. ~~**Stale and down states are coded but no one has seen them.**~~ **Fixed** `8330ae5`: screenshots of both. Stop the worker for over 2 min to see stale; make a run fail to see down. Screenshot both. (A4, B5, C4)
7. ~~**A live tick hasn't been seen yet.**~~ **Fixed** `8330ae5`: `live-tick.webm`. Repeat on Vercel for A1. "Live · checked" works, but no count has changed on screen. Record a few seconds of one changing. (A1, C4)

Will lose marks:

8. **Two secret keys were pasted into the agent chat** (Supabase secret, Clerk secret `dockcheck-live-local`). Delete both and make fresh ones before deploying. Never paste a secret key.
9. ~~**End-to-end tests are broken.**~~ **Fixed** `49e4248`: 8/8 pass. `e2e/` still uses `saved_stations`, "Save station", "Remove", `/?demo=api-down`. Update the isolation test (two users, `follows`) and the states test (stale, down). (C5, F4)
10. ~~**Isolation is unproven.**~~ **Fixed**: isolation test passes. RLS on `follows` is written, but no second account has checked it can't see the first one's follows. (C5)
11. ~~**`/security-review` hasn't been run**~~ **Fixed**: [`docs/security-review.md`](docs/security-review.md), no findings. on the branch, and AGENTS.md requires it before merging.
12. **B2 not done:** no Railway CLI, no Clerk CLI, Vercel isn't connected to GitHub, and the Supabase MCP is signed in but hasn't been used from an agent session. The "List the MCP servers and CLIs…" prompt hasn't been run.
13. **Ask-your-agent prompts aren't recorded:** ~~B3 walkthrough~~ (saved in `docs/learning.md` §3), B4 "last three runs' logs" (needs Railway), B5 trace, B6 quiz. Save the answers in `docs/learning.md`.
14. **Free-tier limits and spending alerts aren't set** for Vercel, Supabase, Clerk or Railway, and the E7 prompt hasn't been run. (E1–E3, E7)
15. ~~**The A4 migrations are still in `supabase/migrations/`.**~~ **Fixed** `1480ba3` (moved to `docs/a4-migrations/`). `supabase db push` would create A4's tables in this project. Move them out. The A5 migration was applied by hand in the SQL editor, so Supabase's migration history doesn't list it.
16. **`/context` hasn't been checked** to show `AGENTS.md` loaded. (D9)
17. **Design-process write-up for live states** (loading, fresh, stale, down, the highlight on a change) isn't in the README yet. (C7)
18. **Not practised:** F1–F4 out loud.

Nits a strict grader still notices: ~~`package.json` is named `dbs-a4`~~ (fixed); `runs` grows by ~2,900 rows a day with no cleanup (fine for the course, but say so).
