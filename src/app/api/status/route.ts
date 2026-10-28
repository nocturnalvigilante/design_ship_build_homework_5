import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getStatuses } from "@/lib/gbfs";

const MAX_IDS = 20;

// GET /api/status?ids=a,b → live counts for those stations. A missing station
// comes back as null ("nothing found"); 503 is "API down"; stale: true means
// the feed is older than 5 minutes.
export async function GET(req: Request) {
  await auth.protect();

  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS);
  if (ids.length === 0) return NextResponse.json({ statuses: {} });

  const feed = await getStatuses(ids);
  if (!feed.ok) return NextResponse.json({ error: "Divvy is not responding" }, { status: 503 });

  return NextResponse.json({ statuses: feed.data, lastUpdated: feed.lastUpdated, stale: feed.stale });
}
