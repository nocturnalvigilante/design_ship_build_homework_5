"use client";

import { useCallback, useEffect, useState } from "react";
import { ago, freshness, type Freshness, type Run } from "@/lib/freshness";
import { useSupabase } from "@/lib/supabase-browser";
import { formatClock } from "@/lib/time";
import { unfollowStation } from "./actions";

export type Follow = {
  id: string;
  station_id: string;
  nickname: string;
  need: "bike" | "dock";
  name?: string;
  capacity?: number;
};

export type Status = {
  station_id: string;
  bikes: number;
  ebikes: number;
  docks: number;
  is_renting: boolean;
  is_returning: boolean;
  updated_at: string;
};

const STATUS_COLUMNS = "station_id, bikes, ebikes, docks, is_renting, is_returning, updated_at";
const TICK_MS = 5000;

// The page's live part. The server renders the first counts; after that,
// Supabase Realtime pushes each changed station_status row (only stations this
// person follows, enforced by RLS) and each new worker run. See docs/data-flow.md.
export function LiveStations({
  follows,
  initialStatuses,
  initialRun,
  initialLastOkAt,
}: {
  follows: Follow[];
  initialStatuses: Record<string, Status>;
  initialRun: Run | null;
  initialLastOkAt: string | null;
}) {
  const supabase = useSupabase();
  const [statuses, setStatuses] = useState(initialStatuses);
  const [latestRun, setLatestRun] = useState(initialRun);
  const [lastOkAt, setLastOkAt] = useState(initialLastOkAt);
  const [connected, setConnected] = useState(false);
  // Times are only shown once connected, so server and browser render the same HTML.
  const [now, setNow] = useState(0);
  // Bumped when Realtime changes a station's counts, to replay the highlight.
  const [bumps, setBumps] = useState<Record<string, number>>({});

  const ids = follows.map((f) => f.station_id);
  const idsKey = ids.join(",");

  // After a follow, the server sends counts for the new station; take them in
  // instead of waiting for Realtime to reconnect.
  useEffect(() => {
    setStatuses((prev) => ({ ...prev, ...initialStatuses }));
  }, [initialStatuses]);

  // Catch up on anything missed before (re)connecting, e.g. while the tab slept.
  const catchUp = useCallback(async () => {
    if (!supabase) return;
    const [{ data: rows }, { data: runs }, { data: okRuns }] = await Promise.all([
      idsKey
        ? supabase.from("station_status").select(STATUS_COLUMNS).in("station_id", idsKey.split(",")).returns<Status[]>()
        : Promise.resolve({ data: [] as Status[] }),
      supabase.from("runs").select("ok, finished_at").order("finished_at", { ascending: false }).limit(1).returns<Run[]>(),
      supabase.from("runs").select("finished_at").eq("ok", true).order("finished_at", { ascending: false }).limit(1),
    ]);
    if (rows) setStatuses(Object.fromEntries(rows.map((r) => [r.station_id, r])));
    if (runs?.[0]) setLatestRun(runs[0]);
    if (okRuns?.[0]) setLastOkAt(okRuns[0].finished_at);
  }, [supabase, idsKey]);

  useEffect(() => {
    if (!supabase) return;
    let channel = supabase.channel("live");
    if (idsKey) {
      channel = channel.on<Status>(
        "postgres_changes",
        { event: "*", schema: "public", table: "station_status", filter: `station_id=in.(${idsKey})` },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          const row = payload.new;
          setStatuses((prev) => ({ ...prev, [row.station_id]: row }));
          setBumps((prev) => ({ ...prev, [row.station_id]: (prev[row.station_id] ?? 0) + 1 }));
        },
      );
    }
    channel = channel.on<Run>("postgres_changes", { event: "INSERT", schema: "public", table: "runs" }, (payload) => {
      setLatestRun(payload.new);
      if (payload.new.ok) setLastOkAt(payload.new.finished_at);
    });
    channel.subscribe((status) => {
      setConnected(status === "SUBSCRIBED");
      if (status === "SUBSCRIBED") catchUp();
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, idsKey, catchUp]);

  // Keep "checked 12 s ago" moving, and notice when it turns stale.
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const state = freshness(latestRun, connected, now);

  return (
    <>
      <FreshnessLine state={state} latestRun={latestRun} lastOkAt={lastOkAt} now={now} />
      {/* One column on phones; side by side on wider screens. */}
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {follows.map((f) => (
          <StationCard
            key={f.id}
            follow={f}
            status={statuses[f.station_id]}
            bump={bumps[f.station_id] ?? 0}
            state={state}
            now={now}
          />
        ))}
      </ul>
    </>
  );
}

function FreshnessLine({
  state,
  latestRun,
  lastOkAt,
  now,
}: {
  state: Freshness;
  latestRun: Run | null;
  lastOkAt: string | null;
  now: number;
}) {
  if (state === "loading") {
    return (
      <p className="mb-3 flex items-center gap-2 text-sm text-muted">
        <span className="h-2 w-2 animate-pulse rounded-full bg-muted" aria-hidden />
        Connecting to live updates…
      </p>
    );
  }
  if (state === "fresh") {
    return (
      <p className="mb-3 flex items-center gap-2 text-sm text-muted">
        <span className="h-2 w-2 rounded-full bg-good" aria-hidden />
        Live · checked {ago(latestRun!.finished_at, now)}
      </p>
    );
  }
  if (state === "stale") {
    return (
      <div role="status" className="mb-3 rounded-lg border border-warn/40 bg-card p-3 text-sm">
        <p className="font-medium text-warn">Updates have paused</p>
        <p className="mt-1 text-muted">
          {latestRun
            ? `Last checked ${ago(latestRun.finished_at, now)}. These counts may be out of date.`
            : "DockCheck hasn't checked Divvy yet. Counts will appear once it does."}
        </p>
      </div>
    );
  }
  return (
    <div role="status" className="mb-3 rounded-lg border border-empty/40 bg-card p-3 text-sm">
      <p className="font-medium text-empty">Can&apos;t reach Divvy right now</p>
      <p className="mt-1 text-muted">
        {lastOkAt
          ? `Counts below are from ${formatClock(new Date(lastOkAt))}. DockCheck keeps trying every 30 seconds.`
          : "DockCheck keeps trying every 30 seconds."}
      </p>
    </div>
  );
}

function StationCard({
  follow,
  status,
  bump,
  state,
  now,
}: {
  follow: Follow;
  status?: Status;
  bump: number;
  state: Freshness;
  now: number;
}) {
  // Stale or down: still show the counts, but dimmed, since they may be old.
  const old = state === "stale" || state === "down";

  return (
    <li className="rounded-xl border border-line bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{follow.nickname}</p>
          <p className="text-sm text-muted">{follow.name ?? "Station no longer listed"}</p>
        </div>
        <form action={unfollowStation}>
          <input type="hidden" name="id" value={follow.id} />
          <button type="submit" className="min-h-11 px-2 text-sm text-muted hover:text-empty">
            Unfollow
          </button>
        </form>
      </div>

      {status ? (
        <div className={old ? "opacity-60" : undefined}>
          <Counts status={status} need={follow.need} capacity={follow.capacity} bump={bump} />
          {state !== "loading" && (
            <p className="mt-2 text-xs text-muted">Counts last changed {ago(status.updated_at, now)}</p>
          )}
        </div>
      ) : (
        <p className="rounded-lg bg-background p-3 text-sm text-muted">
          No live counts for this station yet. Divvy may no longer list it.
        </p>
      )}
    </li>
  );
}

function Counts({
  status,
  need,
  capacity,
  bump,
}: {
  status: Status;
  need: "bike" | "dock";
  capacity?: number;
  bump: number;
}) {
  const count = need === "bike" ? status.bikes : status.docks;
  const closed = need === "bike" ? !status.is_renting : !status.is_returning;
  const classic = status.bikes - status.ebikes;

  if (closed) {
    return (
      <p className="text-lg font-semibold text-empty">
        Not {need === "bike" ? "renting bikes" : "taking returns"} right now
      </p>
    );
  }
  return (
    <>
      <p className="flex items-baseline gap-2">
        {/* A new key replays the highlight each time Realtime changes the count. */}
        <span
          key={bump}
          className={`rounded px-1 text-4xl font-semibold tabular-nums ${bump ? "tick" : ""} ${count === 0 ? "text-empty" : "text-good"}`}
        >
          {count}
        </span>
        <span className="text-muted">
          {need === "bike" ? (count === 1 ? "bike left" : "bikes left") : count === 1 ? "free dock" : "free docks"}
          {capacity ? ` of ${capacity}` : ""}
        </span>
      </p>
      {need === "bike" && status.bikes > 0 && (
        <p className="mt-1 text-sm text-muted">
          {status.ebikes === status.bikes
            ? `${status.bikes === 1 ? "It's an e-bike" : `All ${status.bikes} are e-bikes`}`
            : `${status.ebikes} e-bike${status.ebikes === 1 ? "" : "s"}, ${classic} classic`}
        </p>
      )}
    </>
  );
}
