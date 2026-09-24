import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Organización del usuario autenticado (el `clinic_id` de patients/protocols).
 * Las políticas tenant exigen que el insert lleve este id; el default de la
 * tabla apunta a un UUID placeholder que el usuario no puede ver.
 */
export async function getSessionOrganizationId(
  supabase: SupabaseClient
): Promise<string> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("No autenticado.");

  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.organization_id) {
    throw new Error("Sin organización. Cerrá sesión y volvé a entrar.");
  }

  return data.organization_id as string;
}
