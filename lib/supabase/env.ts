const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseKey = supabasePublishableKey || supabaseAnonKey;
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const supabaseEnvStatus = {
  hasUrl: Boolean(supabaseUrl),
  hasPublishableKey: Boolean(supabasePublishableKey),
  hasAnonKey: Boolean(supabaseAnonKey),
  keySource: supabasePublishableKey ? "publishable" : supabaseAnonKey ? "anon" : "missing",
};

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);
