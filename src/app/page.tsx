import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { getStations } from "@/lib/gbfs";
import type { Run } from "@/lib/freshness";
import { createSupabaseClient } from "@/lib/supabase";
import { LiveStations, type Follow, type Status } from "./live-stations";
import { Landing } from "./landing";
import { StationSearch } from "./station-search";

export default async function Home() {
  // Signed-out visitors see what the app is (no data) instead of being sent
  // straight to /sign-in. Everything below needs a signed-in user.
  const { userId } = await auth();
  if (!userId) return <Landing />;
  await auth.protect();

  // The first render comes from Supabase (written by the worker); after that,
  // LiveStations keeps it current with Realtime.
  const supabase = createSupabaseClient();
  const [{ data: followRows, error }, stationsFeed, { data: runs }, { data: okRuns }] = await Promise.all([
    supabase
      .from("follows")
      .select("id, station_id, nickname, need")
      .order("created_at")
      .returns<Omit<Follow, "name" | "capacity">[]>(),
    getStations(),
    supabase.from("runs").select("ok, finished_at").order("finished_at", { ascending: false }).limit(1).returns<Run[]>(),
    supabase.from("runs").select("finished_at").eq("ok", true).order("finished_at", { ascending: false }).limit(1),
  ]);

  const names = new Map(stationsFeed.ok ? stationsFeed.data.map((s) => [s.id, s]) : []);
  const follows: Follow[] = (followRows ?? []).map((f) => ({
    ...f,
    name: names.get(f.station_id)?.name,
    capacity: names.get(f.station_id)?.capacity,
  }));

  const ids = follows.map((f) => f.station_id);
  const { data: statusRows } = ids.length
    ? await supabase
        .from("station_status")
        .select("station_id, bikes, ebikes, docks, is_renting, is_returning, updated_at")
        .in("station_id", ids)
        .returns<Status[]>()
    : { data: [] as Status[] };

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg px-4 pt-4 pb-16 md:max-w-5xl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">DockCheck Live</h1>
          <p className="text-sm text-muted">Live Divvy bikes &amp; docks</p>
        </div>
        <UserButton />
      </header>

      <section aria-labelledby="your-stations" className="mb-10">
        <h2 id="your-stations" className="mb-3 text-sm font-medium text-muted">
          Stations you follow
        </h2>

        {error && (
          <p className="rounded-xl bg-card p-4 text-sm text-empty">
            Couldn&apos;t load the stations you follow. Refresh to try again.
          </p>
        )}

        {!error && follows.length === 0 && (
          <div className="rounded-xl border border-dashed border-line p-5 text-center">
            <p className="font-medium">You&apos;re not following any stations yet</p>
            <p className="mt-1 text-sm text-muted">
              This page shows live bikes and free docks at the Divvy stations you use, so you know before you walk over.
            </p>
            <p className="mt-2 text-sm text-muted">
              Open it just before you head out: it shows whether there&apos;s a bike (or a free dock) waiting at your
              station right now, and keeps updating while it&apos;s open.
            </p>
            <p className="mt-2 text-sm text-muted">
              Start below: type a street, like Ellis, pick the station you leave from, and follow it. Its counts will
              update here on their own while the page is open.
            </p>
          </div>
        )}

        {!error && follows.length > 0 && (
          <LiveStations
            follows={follows}
            initialStatuses={Object.fromEntries((statusRows ?? []).map((r) => [r.station_id, r]))}
            initialRun={runs?.[0] ?? null}
            initialLastOkAt={okRuns?.[0]?.finished_at ?? null}
          />
        )}
      </section>

      <section aria-label="Follow a station" className="max-w-lg">
        <StationSearch />
      </section>
    </div>
  );
}
