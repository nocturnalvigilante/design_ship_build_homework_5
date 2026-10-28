"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getStations } from "@/lib/gbfs";
import { createSupabaseClient } from "@/lib/supabase";

export type SaveState = { error?: string; savedAt?: number };

// Every action starts with auth.protect(), and every query goes through the
// user's own Supabase client, so RLS limits it to their rows.

export async function saveStation(_prev: SaveState, formData: FormData): Promise<SaveState> {
  await auth.protect();

  const stationId = String(formData.get("station_id") ?? "");
  const nickname = String(formData.get("nickname") ?? "").trim();
  const need = formData.get("need") === "dock" ? "dock" : "bike";
  if (!nickname) return { error: "Give it a short name, like Lab or Home." };
  if (nickname.length > 40) return { error: "Keep the name under 40 characters." };

  // Only accept station ids Divvy actually lists.
  const stations = await getStations();
  if (stations.ok && !stations.data.some((s) => s.id === stationId)) {
    return { error: "Divvy doesn't list that station any more. Search again." };
  }

  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("saved_stations")
    .insert({ station_id: stationId, nickname, need });
  if (error?.code === "23505") return { error: "You've already saved this station." };
  if (error) return { error: "Couldn't save it. Try again." };

  revalidatePath("/");
  return { savedAt: Date.now() };
}

export async function deleteStation(formData: FormData) {
  await auth.protect();
  const supabase = createSupabaseClient();
  await supabase.from("saved_stations").delete().eq("id", String(formData.get("id")));
  revalidatePath("/");
}

export async function addDeparture(formData: FormData) {
  await auth.protect();

  const weekdays = formData
    .getAll("weekdays")
    .map(Number)
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const leaveAt = String(formData.get("leave_at") ?? "");
  if (weekdays.length === 0 || !/^\d{2}:\d{2}$/.test(leaveAt)) return;

  const supabase = createSupabaseClient();
  await supabase.from("departures").insert({
    saved_station_id: String(formData.get("saved_station_id")),
    weekdays,
    leave_at: leaveAt,
  });
  revalidatePath("/");
}

export async function deleteDeparture(formData: FormData) {
  await auth.protect();
  const supabase = createSupabaseClient();
  await supabase.from("departures").delete().eq("id", String(formData.get("id")));
  revalidatePath("/");
}
