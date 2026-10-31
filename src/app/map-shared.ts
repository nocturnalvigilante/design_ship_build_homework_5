// Shared by the server page and the browser-only map (which can't be imported
// on the server, since Leaflet needs `window`).

// A Divvy station near the ones this person follows, from Divvy's public feed.
// bikes/docks are the public counts when the page loaded (not live).
export type NearbyStation = {
  id: string;
  name: string;
  capacity: number;
  lat: number;
  lon: number;
  bikes?: number;
  docks?: number;
};

// Hyde Park, between the Lab School and the Quad.
export const HYDE_PARK: [number, number] = [41.7905, -87.5995];
