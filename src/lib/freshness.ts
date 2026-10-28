// How current the page's counts are, from the newest worker run.
// See docs/data-flow.md, "Freshness states on the page".

export type Run = { ok: boolean; finished_at: string };
export type Freshness = "loading" | "fresh" | "stale" | "down";

// The worker runs every 30 s, so 2 minutes is about 3 missed runs.
export const STALE_AFTER_MS = 2 * 60 * 1000;

// loading: not connected to live updates yet.
// stale: no run in the last 2 minutes (or ever), so the worker is slow or stopped.
// down: the worker is running but its newest run failed (Divvy unreachable).
// fresh: the newest run worked and is recent.
export function freshness(latest: Run | null, connected: boolean, now: number): Freshness {
  if (!connected) return "loading";
  if (!latest || now - new Date(latest.finished_at).getTime() > STALE_AFTER_MS) return "stale";
  return latest.ok ? "fresh" : "down";
}

// "12 s ago", "4 min ago", "2 h ago"
export function ago(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return `${Math.floor(s / 3600)} h ago`;
}
