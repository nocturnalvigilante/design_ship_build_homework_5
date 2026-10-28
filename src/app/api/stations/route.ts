import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getStations } from "@/lib/gbfs";

const MAX_RESULTS = 10;

// GET /api/stations?q=ellis → up to 10 stations whose name matches.
// An empty list is the "nothing found" state; 503 is "API down".
export async function GET(req: Request) {
  await auth.protect();

  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (q.length < 2) return NextResponse.json({ stations: [] });

  const feed = await getStations();
  if (!feed.ok) return NextResponse.json({ error: "Divvy is not responding" }, { status: 503 });

  const stations = feed.data
    .filter((s) => s.name.toLowerCase().includes(q))
    .slice(0, MAX_RESULTS);
  return NextResponse.json({ stations, lastUpdated: feed.lastUpdated, stale: feed.stale });
}
