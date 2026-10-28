// Runs the worker's parsing and "what changed" logic on the two saved Divvy
// responses (called 3 min apart on 2026-10-28), not the live feed.
// Run with: cd worker && npm test

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { changedRows, parseFeed } from "./stations.js";

const load = (name) =>
  JSON.parse(readFileSync(join(import.meta.dirname, "../docs/evidence", name), "utf8"));
const call1 = parseFeed(load("status-call-1.json"));
const call2 = parseFeed(load("status-call-2.json"));
const snapshotOf = (rows) => new Map(rows.map((r) => [r.station_id, r]));

test("parses every station into a station_status row", () => {
  assert.equal(call1.rows.length, 2076);
  const row = call1.rows.find((r) => r.station_id === "1992234898774407528");
  assert.deepEqual(row, {
    station_id: "1992234898774407528",
    bikes: 3,
    ebikes: 0,
    docks: 4,
    is_renting: true,
    is_returning: true,
    last_reported: new Date(1793163261 * 1000).toISOString(),
  });
});

test("saves only the 28 stations whose counts changed between the two calls", () => {
  const changed = changedRows(call2.rows, snapshotOf(call1.rows));
  assert.equal(changed.length, 28);
  // What gets saved is the new value from call 2, not the old one.
  for (const row of changed) {
    assert.deepEqual(row, call2.rows.find((r) => r.station_id === row.station_id));
  }
});

test("a new last_reported alone is not a change", () => {
  // 1,116 stations checked in between the calls; most kept the same counts.
  const movedOnly = call2.rows.filter((r) => {
    const old = snapshotOf(call1.rows).get(r.station_id);
    return old.last_reported !== r.last_reported && changedRows([r], new Map([[r.station_id, old]])).length === 0;
  });
  assert.ok(movedOnly.length > 1000);
});

test("disabled bikes or docks changing alone is not a change", () => {
  // These two only changed num_bikes_disabled / num_docks_disabled, which the page doesn't show.
  const changedIds = changedRows(call2.rows, snapshotOf(call1.rows)).map((r) => r.station_id);
  assert.ok(!changedIds.includes("a3a6ce53-a135-11e9-9cda-0a87ae2ba916"));
  assert.ok(!changedIds.includes("a3a49cd7-a135-11e9-9cda-0a87ae2ba916"));
});

test("the same response twice saves nothing", () => {
  assert.equal(changedRows(call2.rows, snapshotOf(call2.rows)).length, 0);
});

test("an empty snapshot (first run on an empty table) saves every station", () => {
  assert.equal(changedRows(call1.rows, new Map()).length, 2076);
});

test("a response that isn't GBFS is rejected, so the run is logged as failed", () => {
  assert.throws(() => parseFeed({ error: "maintenance" }), /not GBFS/);
  assert.throws(
    () => parseFeed({ last_updated: 1, data: { stations: [{ station_id: "x", num_bikes_available: -1 }] } }),
    /bad station/,
  );
});
