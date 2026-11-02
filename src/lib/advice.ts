// What the page tells someone to do, not just the number: walk to your station,
// hurry, or go somewhere else. Pure functions, so src/lib/advice.test.ts can
// check them without a browser.

export type Verdict = "go" | "low" | "empty" | "closed";

// 1 or 2 left can be gone by the time you walk over.
export const LOW_AT = 2;

export function verdict(count: number, closed: boolean): Verdict {
  if (closed) return "closed";
  if (count === 0) return "empty";
  return count <= LOW_AT ? "low" : "go";
}

// One line saying what to do, for a bike or a free dock.
export function verdictText(v: Verdict, need: "bike" | "dock"): string {
  const thing = need === "bike" ? "bike" : "free dock";
  switch (v) {
    case "go":
      return `Go: there's a ${thing} waiting`;
    case "low":
      return `Go now: only a few left`;
    case "empty":
      return need === "bike" ? "Empty: don't walk over" : "Full: nowhere to dock";
    case "closed":
      return need === "bike" ? "Closed for rentals: don't walk over" : "Closed for returns: go elsewhere";
  }
}

// Distance in km between two points (equirectangular; fine at city scale).
export function km(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const x = (((lon2 - lon1) * Math.PI) / 180) * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  const y = ((lat2 - lat1) * Math.PI) / 180;
  return Math.sqrt(x * x + y * y) * 6371;
}

// Streets aren't straight lines: about 1.3x the direct distance, at 5 km/h.
export function walkMinutes(distanceKm: number): number {
  return Math.max(1, Math.round(distanceKm * 1.3 * 12));
}

export type Candidate = { id: string; name: string; lat: number; lon: number; bikes?: number; docks?: number };
export type Alternative = { id: string; name: string; lat: number; lon: number; count: number; minutes: number };

// Furthest we'd suggest walking instead.
export const MAX_ALTERNATIVE_KM = 1.5;

// The nearest other station that has what you need (more than LOW_AT of it,
// so it's still there when you arrive), within walking distance. null if none.
export function nearestAlternative(
  from: { station_id: string; lat: number; lon: number },
  need: "bike" | "dock",
  candidates: Candidate[],
): Alternative | null {
  let best: Alternative | null = null;
  let bestKm = Infinity;
  for (const c of candidates) {
    if (c.id === from.station_id) continue;
    const count = need === "bike" ? c.bikes : c.docks;
    if (count === undefined || count <= LOW_AT) continue;
    const d = km(from.lat, from.lon, c.lat, c.lon);
    if (d > MAX_ALTERNATIVE_KM || d >= bestKm) continue;
    bestKm = d;
    best = { id: c.id, name: c.name, lat: c.lat, lon: c.lon, count, minutes: walkMinutes(d) };
  }
  return best;
}
