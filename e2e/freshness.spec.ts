import { expect, test } from "@playwright/test";
import { STALE_AFTER_MS, ago, freshness } from "../src/lib/freshness";

// The rules behind the page's live states, without a browser or the worker.
const now = Date.parse("2026-10-28T10:00:00Z");
const secondsAgo = (s: number) => new Date(now - s * 1000).toISOString();

test("loading until Realtime connects, whatever the runs say", () => {
  expect(freshness({ ok: true, finished_at: secondsAgo(5) }, false, now)).toBe("loading");
});

test("fresh when the newest run worked and is recent", () => {
  expect(freshness({ ok: true, finished_at: secondsAgo(5) }, true, now)).toBe("fresh");
  expect(freshness({ ok: true, finished_at: secondsAgo(STALE_AFTER_MS / 1000) }, true, now)).toBe("fresh");
});

test("down when the newest run failed but the worker is still reporting", () => {
  expect(freshness({ ok: false, finished_at: secondsAgo(5) }, true, now)).toBe("down");
});

test("stale when no run for over 2 minutes, even if the last one worked or failed", () => {
  expect(freshness({ ok: true, finished_at: secondsAgo(121) }, true, now)).toBe("stale");
  expect(freshness({ ok: false, finished_at: secondsAgo(600) }, true, now)).toBe("stale");
});

test("stale when the worker has never run", () => {
  expect(freshness(null, true, now)).toBe("stale");
});

test("ago reads naturally", () => {
  expect(ago(secondsAgo(12), now)).toBe("12 s ago");
  expect(ago(secondsAgo(4 * 60 + 5), now)).toBe("4 min ago");
  expect(ago(secondsAgo(2 * 3600), now)).toBe("2 h ago");
});
