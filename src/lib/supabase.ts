import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * The anon key is *designed* to be public — but ONLY because Row Level Security
 * is what actually protects the rows. `docs/supabase/schema.sql` enables RLS on
 * every table. Without it, this key is an open door to your employee data.
 *
 * If the env vars are absent the client is null and the app falls back to the
 * local adapters, so a fresh clone still runs with zero setup.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null;

export const isSupabaseConfigured = supabase !== null;
