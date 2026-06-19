import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server components cannot set cookies; middleware and actions can.
        }
      },
    },
  });
}
