import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { getPublicCounts, getStations } from "@/lib/gbfs";
import type { Run } from "@/lib/freshness";
import { createSupabaseClient } from "@/lib/supabase";
import { Dashboard } from "./dashboard";
import type { Follow, Status } from "./live-stations";
import { Landing } from "./landing";
import { HYDE_PARK, type NearbyStation } from "./map-shared";

export default async function Home() {
  // Signed-out visitors see what the app is (no data) instead of being sent
  // straight to /sign-in. Everything below needs a signed-in user.
  const { userId } = await auth();
  if (!userId) return <Landing />;
  await auth.protect();

  // The first render comes from Supabase (written by the worker); after that,
  // LiveStations keeps it current with Realtime.
  const supabase = createSupabaseClient();
  const [{ data: followRows, error }, stationsFeed, { data: runs }, { data: okRuns }, countsFeed] = await Promise.all([
    supabase
      .from("follows")
      .select("id, station_id, nickname, need")
      .order("created_at")
      .returns<Omit<Follow, "name" | "capacity" | "lat" | "lon">[]>(),
    getStations(),
    supabase.from("runs").select("ok, finished_at").order("finished_at", { ascending: false }).limit(1).returns<Run[]>(),
    supabase.from("runs").select("finished_at").eq("ok", true).order("finished_at", { ascending: false }).limit(1),
    getPublicCounts(),
  ]);

  const names = new Map(stationsFeed.ok ? stationsFeed.data.map((s) => [s.id, s]) : []);
  const follows: Follow[] = (followRows ?? []).map((f) => ({
    ...f,
    name: names.get(f.station_id)?.name,
    capacity: names.get(f.station_id)?.capacity,
    lat: names.get(f.station_id)?.lat,
    lon: names.get(f.station_id)?.lon,
  }));

  const ids = follows.map((f) => f.station_id);
  const { data: statusRows } = ids.length
    ? await supabase
        .from("station_status")
        .select("station_id, bikes, ebikes, docks, is_renting, is_returning, updated_at")
        .in("station_id", ids)
        .returns<Status[]>()
    : { data: [] as Status[] };

  // Other stations for the map: Divvy's public feed only (names, places and
  // counts), within reach of the followed stations, or of Hyde Park if none.
  // Never anyone else's follows.
  const centres: [number, number][] = follows.some((f) => f.lat !== undefined)
    ? follows.filter((f) => f.lat !== undefined && f.lon !== undefined).map((f) => [f.lat!, f.lon!])
    : [HYDE_PARK];
  const nearby: NearbyStation[] = stationsFeed.ok
    ? stationsFeed.data
        .filter((s) => centres.some(([lat, lon]) => km(lat, lon, s.lat, s.lon) <= NEARBY_KM))
        .slice(0, MAX_NEARBY)
        .map((s) => {
          const c = countsFeed.ok ? countsFeed.data.get(s.id) : undefined;
          return { id: s.id, name: s.name, capacity: s.capacity, lat: s.lat, lon: s.lon, bikes: c?.bikes, docks: c?.docks };
        })
    : [];

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg px-4 pt-4 pb-16 md:max-w-5xl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">DockCheck Live</h1>
          <p className="text-sm text-muted">Live Divvy bikes &amp; docks</p>
        </div>
        <UserButton />
      </header>

      <Dashboard
        follows={follows}
        loadError={Boolean(error)}
        nearby={nearby}
        initialStatuses={Object.fromEntries((statusRows ?? []).map((r) => [r.station_id, r]))}
        initialRun={runs?.[0] ?? null}
        initialLastOkAt={okRuns?.[0]?.finished_at ?? null}
      />
    </div>
  );
}

const NEARBY_KM = 2;
const MAX_NEARBY = 300;

// Distance in km between two points (equirectangular; fine at city scale).
function km(lat1: number, lon1: number, lat2: number, lon2: number) {
  const x = ((lon2 - lon1) * Math.PI) / 180 * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  const y = ((lat2 - lat1) * Math.PI) / 180;
  return Math.sqrt(x * x + y * y) * 6371;
}
