// DockCheck Live worker, a Supabase Edge Function. Supabase Cron calls it every
// 30 s: fetch Divvy's station_status, upsert only the stations whose counts
// changed, and record the call in the runs table. See docs/data-flow.md, arrows 0 to 3.

import { changedRows, parseFeed } from "./stations.ts";
import type { Counts } from "./stations.ts";

// FEED_URL can be set as a function secret pointing at a broken URL, to see the
// page's "down" state on purpose.
const FEED_URL = Deno.env.get("FEED_URL") ?? "https://gbfs.lyft.com/gbfs/1.1/chi/en/station_status.json";
const TIMEOUT_MS = 8_000;
const PAGE_SIZE = 1000; // Supabase returns at most 1,000 rows per request

// Supabase gives the function these on its own servers; they are never in code.
// SUPABASE_SECRET_KEYS is a JSON object of the project's secret keys, by name.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SECRET_KEYS: Record<string, string> = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");

// The secret key cron sent, once checked against SECRET_KEYS. The function writes
// with that same key, so rotating it is one change in Vault, whatever it's named.
let secretKey = "";

// Calls Supabase's REST API with the secret key, which bypasses RLS.
async function rest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: secretKey, "Content-Type": "application/json", ...options.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    // Only the status and the start of Supabase's message: never the key.
    throw new Error(`supabase ${path.split("?")[0]} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res;
}

// The last counts saved for each station. Read from the table on every call:
// an Edge Function keeps nothing between calls, and a copy kept in a warm
// instance's memory could disagree with the table and skip a real change.
async function loadSnapshot() {
  const map = new Map<string, Counts & { station_id: string }>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const res = await rest(
      "station_status?select=station_id,bikes,ebikes,docks,is_renting,is_returning&order=station_id",
      { headers: { Range: `${from}-${from + PAGE_SIZE - 1}` } },
    );
    const page = await res.json();
    for (const row of page) map.set(row.station_id, row);
    if (page.length < PAGE_SIZE) return map;
  }
}

async function fetchFeed() {
  const res = await fetch(FEED_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`divvy ${res.status}`);
  return parseFeed(await res.json());
}

async function runOnce() {
  const startedAt = new Date();
  let run = { ok: false, rows_changed: 0, error: null as string | null, feed_last_updated: null as string | null };
  try {
    const [snapshot, { rows, lastUpdated }] = await Promise.all([loadSnapshot(), fetchFeed()]);
    run.feed_last_updated = lastUpdated;

    const changed = changedRows(rows, snapshot);
    if (changed.length > 0) {
      const now = new Date().toISOString();
      await rest("station_status", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(changed.map((row) => ({ ...row, updated_at: now }))),
      });
    }
    run = { ...run, ok: true, rows_changed: changed.length };
  } catch (err) {
    run.error = String((err as Error)?.message ?? err).slice(0, 500);
  }

  const finishedAt = new Date();
  try {
    await rest("runs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        ...run,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
      }),
    });
  } catch (err) {
    // No runs row means the page will show stale: the log is the only record.
    console.error(`could not record run: ${(err as Error).message}`);
  }

  const took = finishedAt.getTime() - startedAt.getTime();
  console.log(
    run.ok
      ? `run ok changed=${run.rows_changed} feed=${run.feed_last_updated} took=${took}ms`
      : `run FAILED error="${run.error}" took=${took}ms`,
  );
  return run;
}

// verify_jwt is off, because the new secret keys aren't JWTs. Instead, only a
// caller sending one of this project's secret keys on the apikey header (cron,
// from Vault) can start a run. Anyone else gets 401 and nothing is logged.
Deno.serve(async (req) => {
  const apikey = req.headers.get("apikey");
  if (req.method !== "POST" || !apikey || !Object.values(SECRET_KEYS).includes(apikey)) {
    return new Response("unauthorized", { status: 401 });
  }
  secretKey = apikey;
  const run = await runOnce();
  return Response.json(run, { status: run.ok ? 200 : 502 });
});
