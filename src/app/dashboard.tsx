"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Run } from "@/lib/freshness";
import { LiveStations, useLiveStatus, type Follow, type Status } from "./live-stations";
import { StationSearch, type Result } from "./station-search";
import type { NearbyStation } from "./map-shared";

// Leaflet needs `window`, so the map only renders in the browser.
const StationsMap = dynamic(() => import("./stations-map").then((m) => m.StationsMap), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-xl bg-card md:h-[420px]" />,
});

// The signed-in page's client part: one Realtime state (useLiveStatus) feeds
// both the cards and the map, and a click on the map starts the same follow
// form as search.
export function Dashboard({
  follows,
  loadError,
  nearby,
  initialStatuses,
  initialRun,
  initialLastOkAt,
}: {
  follows: Follow[];
  loadError: boolean;
  nearby: NearbyStation[];
  initialStatuses: Record<string, Status>;
  initialRun: Run | null;
  initialLastOkAt: string | null;
}) {
  const live = useLiveStatus({ follows, initialStatuses, initialRun, initialLastOkAt });
  const [picked, setPicked] = useState<Result | null>(null);

  return (
    <>
      <section aria-labelledby="your-stations" className="mb-10">
        <h2 id="your-stations" className="mb-3 text-sm font-medium text-muted">
          Stations you follow
        </h2>

        {loadError && (
          <p className="rounded-xl bg-card p-4 text-sm text-empty">
            Couldn&apos;t load the stations you follow. Refresh to try again.
          </p>
        )}

        {!loadError && follows.length === 0 && (
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
              Start below: click a blue dot on the map, or type a street, like Ellis, in the search box. Pick the
              station you leave from and follow it. Its counts will update here on their own while the page is open.
            </p>
          </div>
        )}

        {!loadError && follows.length > 0 && <LiveStations follows={follows} live={live} />}
      </section>

      {/* Map and follow form side by side on desktop; stacked on phones. */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-label="Map of Divvy stations">
          <h2 className="mb-3 text-sm font-medium text-muted">Map</h2>
          <StationsMap follows={follows} statuses={live.statuses} nearby={nearby} onPick={setPicked} />
          <p className="mt-2 text-xs text-muted">
            Your stations show their live count. Blue dots are other Divvy stations nearby (grey: no bikes when the
            page loaded); click one to follow it.
          </p>
        </section>

        <section aria-label="Follow a station">
          <h2 className="mb-3 text-sm font-medium text-muted">Follow a station</h2>
          <StationSearch picked={picked} setPicked={setPicked} />
        </section>
      </div>
    </>
  );
}
