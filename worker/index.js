// DockCheck Live worker: every 30 s, fetch Divvy's station_status, upsert only
// the stations whose counts changed, and record the run in the runs table.
// See docs/data-flow.md, arrows 1 to 3.

import { changedRows, parseFeed } from "./stations.js";

// FEED_URL can be pointed at a broken URL to see the page's "down" state on purpose.
const FEED_URL = process.env.FEED_URL ?? "https://gbfs.lyft.com/gbfs/1.1/chi/en/station_status.json";
const INTERVAL_MS = 30_000;
const TIMEOUT_MS = 8_000;
const PAGE_SIZE = 1000; // Supabase returns at most 1,000 rows per request

// Both come from Railway's variables (or worker/.env locally), never from code.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SECRET_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
  process.exit(1);
}

// Calls Supabase's REST API with the secret key, which bypasses RLS.
async function rest(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: SECRET_KEY, "Content-Type": "application/json", ...options.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    // Only the status and the start of Supabase's message: never the key.
    throw new Error(`supabase ${path.split("?")[0]} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res;
}

// The last counts saved for each station, so a restart doesn't rewrite all ~2,000.
// Loaded from the table once, then kept in memory.
let snapshot = null;

async function loadSnapshot() {
  const map = new Map();
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
  let run = { ok: false, rows_changed: 0, error: null, feed_last_updated: null };
  try {
    // If loading failed last time, try again this run.
    snapshot ??= await loadSnapshot();
    const { rows, lastUpdated } = await fetchFeed();
    run.feed_last_updated = lastUpdated;

    const changed = changedRows(rows, snapshot);
    if (changed.length > 0) {
      const now = new Date().toISOString();
      await rest("station_status", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(changed.map((row) => ({ ...row, updated_at: now }))),
      });
      // Only after the upsert worked, so a failed write is retried next run.
      for (const row of changed) snapshot.set(row.station_id, row);
    }
    run = { ...run, ok: true, rows_changed: changed.length };
  } catch (err) {
    run.error = String(err?.message ?? err).slice(0, 500);
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
    console.error(`could not record run: ${err.message}`);
  }

  const took = finishedAt - startedAt;
  console.log(
    run.ok
      ? `run ok changed=${run.rows_changed} feed=${run.feed_last_updated} took=${took}ms`
      : `run FAILED error="${run.error}" took=${took}ms`,
  );
}

// Runs never overlap: the next one is scheduled when this one finishes,
// 30 s after it started (or right away if it took longer than that).
async function loop() {
  const started = Date.now();
  await runOnce();
  setTimeout(loop, Math.max(0, INTERVAL_MS - (Date.now() - started)));
}

console.log(`worker starting: polling Divvy every ${INTERVAL_MS / 1000} s`);
loop();
