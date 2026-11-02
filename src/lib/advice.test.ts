// Run with: npm run test:advice
import assert from "node:assert/strict";
import { test } from "node:test";
import { nearestAlternative, verdict, verdictText, walkMinutes } from "./advice.ts";

test("verdict: closed beats any count, 0 is empty, 1-2 is low, 3+ is go", () => {
  assert.equal(verdict(5, true), "closed");
  assert.equal(verdict(0, false), "empty");
  assert.equal(verdict(1, false), "low");
  assert.equal(verdict(2, false), "low");
  assert.equal(verdict(3, false), "go");
});

test("verdict text speaks to what you need", () => {
  assert.equal(verdictText("empty", "bike"), "Empty: don't walk over");
  assert.equal(verdictText("empty", "dock"), "Full: nowhere to dock");
  assert.match(verdictText("go", "dock"), /free dock/);
});

// Ellis & 55th, with stations roughly 0.4 km and 0.9 km away, and one 3 km away.
const from = { station_id: "ellis55", lat: 41.7951, lon: -87.6017 };
const near = { id: "near", name: "Near", lat: 41.7951, lon: -87.5969 };
const further = { id: "further", name: "Further", lat: 41.7951, lon: -87.5909 };
const far = { id: "far", name: "Far", lat: 41.8221, lon: -87.6017 };

test("suggests the nearest station that has more than a couple left", () => {
  const alt = nearestAlternative(from, "bike", [
    { ...further, bikes: 6 },
    { ...near, bikes: 4 },
    { ...far, bikes: 20 },
  ]);
  assert.equal(alt?.id, "near");
  assert.equal(alt?.count, 4);
  assert.ok(alt!.minutes >= 4 && alt!.minutes <= 8, `minutes ${alt?.minutes}`);
});

test("skips stations that are low, unknown, the same station, or too far", () => {
  const alt = nearestAlternative(from, "bike", [
    { ...near, bikes: 2 },
    { id: "unknown", name: "Unknown", lat: 41.7952, lon: -87.6 },
    { id: "ellis55", name: "Itself", lat: from.lat, lon: from.lon, bikes: 9 },
    { ...further, bikes: 5 },
    { ...far, bikes: 20 },
  ]);
  assert.equal(alt?.id, "further");
});

test("uses docks when you need a dock, and returns null when nothing fits", () => {
  assert.equal(nearestAlternative(from, "dock", [{ ...near, bikes: 9, docks: 0 }]), null);
  assert.equal(nearestAlternative(from, "dock", [{ ...near, bikes: 0, docks: 7 }])?.id, "near");
  assert.equal(nearestAlternative(from, "bike", [{ ...far, bikes: 20 }]), null);
});

test("walking minutes are never 0", () => {
  assert.equal(walkMinutes(0.01), 1);
});
