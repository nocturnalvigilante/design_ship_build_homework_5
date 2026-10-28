import "server-only";

// Divvy GBFS station names, for search and labels. Live counts come from
// Supabase, written by the worker. Fetched on our server and cached for 60 s
// (the feed's ttl), so one fetch serves every user instead of each phone
// downloading ~2 MB.
const BASE = "https://gbfs.lyft.com/gbfs/1.1/chi/en";
const TTL_S = 60;
const TIMEOUT_MS = 8000;
// A feed older than this is treated as "API down".
const STALE_AFTER_S = 5 * 60;

export type Station = {
  id: string;
  name: string;
  capacity: number;
};

export type FeedResult<T> =
  | { ok: true; data: T; lastUpdated: number; stale: boolean }
  | { ok: false };

type RawFeed<T> = { last_updated: number; data: { stations: T[] } };

async function fetchFeed<T>(name: string): Promise<FeedResult<T[]>> {
  try {
    const res = await fetch(`${BASE}/${name}.json`, {
      next: { revalidate: TTL_S },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false };
    const feed = (await res.json()) as RawFeed<T>;
    const ageS = Date.now() / 1000 - feed.last_updated;
    return {
      ok: true,
      data: feed.data.stations,
      lastUpdated: feed.last_updated,
      stale: ageS > STALE_AFTER_S,
    };
  } catch {
    // Timeout, network error or bad JSON.
    return { ok: false };
  }
}

type RawStation = { station_id: string; name: string; capacity: number };

export async function getStations(): Promise<FeedResult<Station[]>> {
  const feed = await fetchFeed<RawStation>("station_information");
  if (!feed.ok) return feed;
  return {
    ...feed,
    data: feed.data.map((s) => ({ id: s.station_id, name: s.name, capacity: s.capacity })),
  };
}
