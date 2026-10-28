"use client";

import { useSession } from "@clerk/nextjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useMemo } from "react";

// A Supabase client in the browser that acts as the signed-in Clerk user, for
// Realtime. Every request and the Realtime connection carry their Clerk session
// token, so RLS sees their id in auth.jwt()->>'sub'. Only publishable keys here.
// Returns null until Clerk has loaded the session.
export function useSupabase(): SupabaseClient | null {
  const { session } = useSession();
  return useMemo(() => {
    if (!session) return null;
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { accessToken: async () => (await session.getToken()) ?? null },
    );
  }, [session]);
}
