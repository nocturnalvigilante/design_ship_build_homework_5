import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { getStations, getStatuses, type StationStatus } from "@/lib/gbfs";
import { createSupabaseClient } from "@/lib/supabase";
import {
  WEEKDAYS,
  chicagoWeekdayAndMinutes,
  formatClock,
  formatLeaveAt,
  formatWeekdays,
  minutesOfDay,
} from "@/lib/time";
import { addDeparture, deleteDeparture, deleteStation } from "./actions";
import { StationSearch } from "./station-search";

type Departure = { id: string; weekdays: number[]; leave_at: string };
type SavedStation = {
  id: string;
  station_id: string;
  nickname: string;
  need: "bike" | "dock";
  departures: Departure[];
};
type Check = { station_id: string; bikes: number; ebikes: number; docks: number; checked_at: string };

// Record at most one check per station every 5 minutes, so refreshing doesn't flood the history.
const CHECK_EVERY_MS = 5 * 60 * 1000;
// A check counts toward a departure if it was within 20 minutes of the leave time.
const NEAR_MINUTES = 20;
const HISTORY_DAYS = 60;

export default async function Home({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  // Signed-out visitors are sent to /sign-in before anything renders.
  await auth.protect();
  // /?demo=api-down shows the "Divvy is down" state on demand, for demos and the test.
  const simulateDown = (await searchParams).demo === "api-down";

  const supabase = createSupabaseClient();
  const [{ data: saved, error }, stationsFeed] = await Promise.all([
    supabase
      .from("saved_stations")
      .select("id, station_id, nickname, need, departures(id, weekdays, leave_at)")
      .order("created_at")
      .returns<SavedStation[]>(),
    getStations(),
  ]);

  const stations = saved ?? [];
  const ids = stations.map((s) => s.station_id);
  const names = new Map(stationsFeed.ok ? stationsFeed.data.map((s) => [s.id, s]) : []);

  const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const [statusFeed, { data: checkRows }] = await Promise.all([
    simulateDown ? Promise.resolve({ ok: false } as const) : getStatuses(ids),
    ids.length
      ? supabase
          .from("checks")
          .select("station_id, bikes, ebikes, docks, checked_at")
          .in("station_id", ids)
          .gte("checked_at", since)
          .order("checked_at", { ascending: false })
          .limit(2000)
          .returns<Check[]>()
      : Promise.resolve({ data: [] as Check[] }),
  ]);
  const checks = checkRows ?? [];

  // This visit is a check: remember what was there, for "usually empty around then".
  if (statusFeed.ok && !statusFeed.stale) {
    const fresh = Date.now() - CHECK_EVERY_MS;
    const newChecks = ids.flatMap((id) => {
      const status = statusFeed.data[id];
      const last = checks.find((c) => c.station_id === id);
      if (!status || (last && new Date(last.checked_at).getTime() > fresh)) return [];
      return [{ station_id: id, bikes: status.bikes, ebikes: status.ebikes, docks: status.docks }];
    });
    if (newChecks.length) await supabase.from("checks").insert(newChecks);
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg px-4 pt-4 pb-16">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">DockCheck</h1>
        <UserButton />
      </header>

      <section aria-labelledby="your-stations" className="mb-10">
        <h2 id="your-stations" className="mb-3 text-sm font-medium text-muted">
          Your stations
          {statusFeed.ok && !statusFeed.stale && ` · live as of ${formatClock(new Date(statusFeed.lastUpdated * 1000))}`}
        </h2>

        {error && (
          <p className="rounded-xl bg-card p-4 text-sm text-empty">
            Couldn&apos;t load your saved stations. Refresh to try again.
          </p>
        )}

        {!error && stations.length === 0 && (
          <div className="rounded-xl border border-dashed border-line p-5 text-center">
            <p className="font-medium">No stations yet</p>
            <p className="mt-1 text-sm text-muted">
              Search below for the station you leave from, like Ellis Ave &amp; 58th St, and save it as &ldquo;Lab&rdquo;.
            </p>
          </div>
        )}

        <ul className="space-y-4">
          {stations.map((s) => (
            <StationCard
              key={s.id}
              saved={s}
              name={names.get(s.station_id)?.name}
              capacity={names.get(s.station_id)?.capacity}
              feed={statusFeed}
              checks={checks.filter((c) => c.station_id === s.station_id)}
            />
          ))}
        </ul>
      </section>

      <section aria-label="Add a station">
        <StationSearch />
      </section>
    </div>
  );
}

function StationCard({
  saved,
  name,
  capacity,
  feed,
  checks,
}: {
  saved: SavedStation;
  name?: string;
  capacity?: number;
  feed: Awaited<ReturnType<typeof getStatuses>>;
  checks: Check[];
}) {
  const status = feed.ok ? feed.data[saved.station_id] : undefined;
  const lastKnown = checks[0];

  return (
    <li className="rounded-xl border border-line bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{saved.nickname}</p>
          <p className="text-sm text-muted">{name ?? "Station no longer listed"}</p>
        </div>
        <form action={deleteStation}>
          <input type="hidden" name="id" value={saved.id} />
          <button type="submit" className="min-h-11 px-2 text-sm text-muted hover:text-empty">
            Remove
          </button>
        </form>
      </div>

      {!feed.ok ? (
        // API down: show the last known counts, labelled with their time.
        <div className="rounded-lg bg-background p-3 text-sm">
          <p className="font-medium text-warn">Divvy isn&apos;t responding right now.</p>
          {lastKnown ? (
            <p className="mt-1 text-muted">
              Last known at {formatClock(new Date(lastKnown.checked_at))}:{" "}
              {saved.need === "bike" ? `${lastKnown.bikes} bikes` : `${lastKnown.docks} free docks`}
            </p>
          ) : (
            <p className="mt-1 text-muted">No earlier check to fall back on yet.</p>
          )}
        </div>
      ) : status === null ? (
        // Nothing found: GBFS no longer lists this station.
        <p className="rounded-lg bg-background p-3 text-sm text-muted">
          Divvy no longer lists this station. It may have moved or closed. Remove it and search for a nearby one.
        </p>
      ) : status ? (
        <LiveCounts status={status} need={saved.need} capacity={capacity} stale={feed.stale} lastUpdated={feed.lastUpdated} />
      ) : null}

      <Departures saved={saved} checks={checks} />
    </li>
  );
}

function LiveCounts({
  status,
  need,
  capacity,
  stale,
  lastUpdated,
}: {
  status: StationStatus;
  need: "bike" | "dock";
  capacity?: number;
  stale: boolean;
  lastUpdated: number;
}) {
  const count = need === "bike" ? status.bikes : status.docks;
  const closed = need === "bike" ? !status.isRenting : !status.isReturning;
  const classic = status.bikes - status.ebikes;

  return (
    <div>
      {stale && (
        <p className="mb-2 text-sm text-warn">
          Divvy&apos;s data is out of date (last updated {formatClock(new Date(lastUpdated * 1000))}). These counts may be old.
        </p>
      )}
      {closed ? (
        <p className="text-lg font-semibold text-empty">
          Not {need === "bike" ? "renting bikes" : "taking returns"} right now
        </p>
      ) : (
        <p className="flex items-baseline gap-2">
          <span className={`text-4xl font-semibold tabular-nums ${count === 0 ? "text-empty" : "text-good"}`}>
            {count}
          </span>
          <span className="text-muted">
            {need === "bike" ? (count === 1 ? "bike left" : "bikes left") : count === 1 ? "free dock" : "free docks"}
            {capacity ? ` of ${capacity}` : ""}
          </span>
        </p>
      )}
      {need === "bike" && status.bikes > 0 && (
        <p className="mt-1 text-sm text-muted">
          {status.ebikes === status.bikes
            ? `${status.bikes === 1 ? "It's an e-bike" : `All ${status.bikes} are e-bikes`}`
            : `${status.ebikes} e-bike${status.ebikes === 1 ? "" : "s"}, ${classic} classic`}
        </p>
      )}
    </div>
  );
}

function Departures({ saved, checks }: { saved: SavedStation; checks: Check[] }) {
  return (
    <div className="mt-4 border-t border-line pt-3">
      <h3 className="mb-2 text-sm font-medium">When you leave</h3>

      {saved.departures.length > 0 && (
        <ul className="mb-3 space-y-2">
          {saved.departures.map((d) => (
            <li key={d.id} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p>
                  {formatWeekdays(d.weekdays)} at {formatLeaveAt(d.leave_at)}
                </p>
                <p className="text-muted">{usuallyEmpty(d, saved.need, checks)}</p>
              </div>
              <form action={deleteDeparture}>
                <input type="hidden" name="id" value={d.id} />
                <button type="submit" className="min-h-11 px-2 text-muted hover:text-empty" aria-label="Remove this time">
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <details>
        <summary className="min-h-11 cursor-pointer py-2 text-sm text-accent">Add a time you usually leave</summary>
        <form action={addDeparture} className="mt-2 space-y-3">
          <input type="hidden" name="saved_station_id" value={saved.id} />
          <fieldset>
            <legend className="sr-only">Days</legend>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((day, i) => (
                <label
                  key={day}
                  className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-line bg-background px-2 text-sm has-[:checked]:border-accent has-[:checked]:text-accent"
                >
                  <input type="checkbox" name="weekdays" value={i} defaultChecked={i >= 1 && i <= 5} className="sr-only" />
                  {day}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex gap-2">
            <input
              type="time"
              name="leave_at"
              required
              defaultValue="17:40"
              aria-label="Leave at"
              className="min-h-11 flex-1 rounded-lg border border-line bg-background px-3"
            />
            <button type="submit" className="min-h-11 rounded-lg bg-accent px-4 font-medium text-background">
              Add
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}

// "Empty 3 of 5 times you checked around then", from this user's own checks only.
function usuallyEmpty(d: Departure, need: "bike" | "dock", checks: Check[]): string {
  const target = minutesOfDay(d.leave_at);
  const near = checks.filter((c) => {
    const { weekday, minutes } = chicagoWeekdayAndMinutes(new Date(c.checked_at));
    return d.weekdays.includes(weekday) && Math.abs(minutes - target) <= NEAR_MINUTES;
  });
  if (near.length === 0) return "No checks around this time yet. Open DockCheck when you leave and it will learn.";
  const empty = near.filter((c) => (need === "bike" ? c.bikes : c.docks) === 0).length;
  return `Empty ${empty} of ${near.length} time${near.length === 1 ? "" : "s"} you checked around then`;
}
