import "server-only";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

// A Supabase client that acts as the signed-in Clerk user. Every request carries
// their Clerk session token, so RLS sees their id in auth.jwt()->>'sub' and
// returns only their rows. Call it after auth.protect() in a page or route.
export function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      async accessToken() {
        return (await auth()).getToken();
      },
    },
  );
}
