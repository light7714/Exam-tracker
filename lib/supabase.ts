import { createClient } from "@supabase/supabase-js";

type SupabaseAdminClient = ReturnType<typeof createClient<any>>;

let cachedClient: SupabaseAdminClient | null = null;

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient<any>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return cachedClient;
}
