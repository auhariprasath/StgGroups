import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The Supabase client — the single source of truth for all data and auth.
 * Created in the browser only (SSR gets `null`; all data/auth work happens
 * client-side behind the login gate).
 *
 * Key name matches the Neela convention (VITE_SUPABASE_PUBLISHABLE_KEY) with a
 * fallback to VITE_SUPABASE_ANON_KEY so either name in .env works.
 */

const url = (import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.SUPABASE_URL) as string | undefined;
const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

if (typeof window !== "undefined" && (!url || !publishableKey)) {
  console.error("[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
}

export const supabase: SupabaseClient | null =
  typeof window !== "undefined" && url && publishableKey
    ? createClient(url, publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    : null;
