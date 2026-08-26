import {
  createSupabaseAdminClient,
  isAuditAdminConfigured,
} from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Cliente para lecturas del portal público (prioriza service role si está en Vercel). */
export async function createPortalReadClient(): Promise<SupabaseClient> {
  if (isAuditAdminConfigured()) {
    return createSupabaseAdminClient();
  }
  return await createClient();
}
