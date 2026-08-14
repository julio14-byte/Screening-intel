import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./env";

/** Cliente con service_role — solo servidor (webhooks Stripe). Ignora RLS. */
export function createAdminClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase no configurado.");
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada.");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
