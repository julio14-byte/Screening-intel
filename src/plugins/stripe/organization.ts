import { createClient } from "@/lib/supabase/server";
import type { OrganizationRow } from "./plans";

/** Organización principal del usuario (Fase 1: un research site por owner). */
export async function getOrganizationForUser(
  userId: string
): Promise<OrganizationRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select(
      `
      organization:organizations (
        id,
        name,
        slug,
        plan_id,
        stripe_customer_id,
        stripe_subscription_id,
        subscription_status,
        trial_ends_at,
        patient_limit,
        protocol_limit,
        user_limit,
        created_at
      )
    `
    )
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[stripe] getOrganizationForUser:", error.message);
    return null;
  }

  const org = data?.organization as OrganizationRow | OrganizationRow[] | null;
  if (Array.isArray(org)) return org[0] ?? null;
  return org ?? null;
}
