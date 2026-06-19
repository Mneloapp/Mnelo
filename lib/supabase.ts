import { createClient } from "@supabase/supabase-js";
export { hasSupabaseConfig, supabaseEnvStatus, supabaseKey, supabaseUrl } from "@/lib/supabase/env";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";

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
