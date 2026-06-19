import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseKey = supabasePublishableKey || supabaseAnonKey;

export const supabaseEnvStatus = {
  hasUrl: Boolean(supabaseUrl),
  hasPublishableKey: Boolean(supabasePublishableKey),
  hasAnonKey: Boolean(supabaseAnonKey),
  keySource: supabasePublishableKey ? "publishable" : supabaseAnonKey ? "anon" : "missing",
};

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

export function createSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
