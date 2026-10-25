import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS — only use on the server after an access check.
export function adminDb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
