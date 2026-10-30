"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getStations } from "@/lib/gbfs";
import { createSupabaseClient } from "@/lib/supabase";

export type FollowState = { error?: string; savedAt?: number };

// Every action starts with auth.protect(), and every query goes through the
// user's own Supabase client, so RLS limits it to their rows.

export async function followStation(_prev: FollowState, formData: FormData): Promise<FollowState> {
  await auth.protect();

  const stationId = String(formData.get("station_id") ?? "");
  const typed = String(formData.get("nickname") ?? "").trim();
  const need = formData.get("need") === "dock" ? "dock" : "bike";
  if (typed.length > 40) return { error: "Keep the name under 40 characters." };

  // Only accept station ids Divvy actually lists.
  const stations = await getStations();
  const station = stations.ok ? stations.data.find((s) => s.id === stationId) : undefined;
  if (stations.ok && !station) {
    return { error: "Divvy doesn't list that station any more. Search again." };
  }

  // The nickname is optional: left blank, the station's own name is used.
  const nickname = typed || station?.name.slice(0, 40);
  if (!nickname) return { error: "Divvy isn't responding, so give it a short name, like Lab or Home." };

  const supabase = createSupabaseClient();
  const { error } = await supabase.from("follows").insert({ station_id: stationId, nickname, need });
  if (error?.code === "23505") return { error: "You already follow this station." };
  if (error) return { error: "Couldn't follow it. Try again." };

  revalidatePath("/");
  return { savedAt: Date.now() };
}

export async function unfollowStation(formData: FormData) {
  await auth.protect();
  const supabase = createSupabaseClient();
  await supabase.from("follows").delete().eq("id", String(formData.get("id")));
  revalidatePath("/");
}
