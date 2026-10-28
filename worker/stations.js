// Pure functions: no network, no clock. The worker test runs these on a saved
// copy of Divvy's response.

// Turns Divvy's station_status.json into one row per station, shaped like the
// station_status table. Throws if the feed doesn't look like GBFS, so the run
// is logged as failed instead of saving nonsense.
export function parseFeed(feed) {
  const stations = feed?.data?.stations;
  if (!Array.isArray(stations) || typeof feed.last_updated !== "number") {
    throw new Error("feed is not GBFS station_status");
  }
  const rows = stations.map((s) => {
    const counts = [s.num_bikes_available, s.num_ebikes_available, s.num_docks_available];
    if (typeof s.station_id !== "string" || !counts.every((n) => Number.isInteger(n) && n >= 0)) {
      throw new Error(`bad station in feed: ${String(s.station_id).slice(0, 40)}`);
    }
    return {
      station_id: s.station_id,
      bikes: s.num_bikes_available, // all rentable bikes, e-bikes included
      ebikes: s.num_ebikes_available,
      docks: s.num_docks_available,
      is_renting: s.is_renting === 1,
      is_returning: s.is_returning === 1,
      last_reported: new Date(s.last_reported * 1000).toISOString(),
    };
  });
  return { rows, lastUpdated: new Date(feed.last_updated * 1000).toISOString() };
}

// The fields that count as a change. last_reported is left out on purpose:
// ~1,100 stations check in every few minutes with the same counts.
const FIELDS = ["bikes", "ebikes", "docks", "is_renting", "is_returning"];

// Rows whose counts or status differ from the last snapshot (a Map of
// station_id to row). A station not in the snapshot counts as changed.
export function changedRows(rows, snapshot) {
  return rows.filter((row) => {
    const old = snapshot.get(row.station_id);
    return !old || FIELDS.some((f) => old[f] !== row[f]);
  });
}
