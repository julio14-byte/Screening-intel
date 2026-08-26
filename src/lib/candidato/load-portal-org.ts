import { createPortalReadClient } from "@/lib/candidato/portal-supabase";
import { createClient } from "@/lib/supabase/server";

export type PortalOrgLoadResult =
  | {
      status: "ok";
      org: {
        id: string;
        name: string;
        slug: string | null;
        portal_enabled: boolean;
      };
    }
  | { status: "not_found" }
  | { status: "portal_disabled"; name?: string }
  | { status: "error"; message: string };

export async function loadPortalOrganization(
  orgSlug: string
): Promise<PortalOrgLoadResult> {
  const normalized = orgSlug.trim().toLowerCase();
  if (!normalized) {
    return { status: "not_found" };
  }

  try {
    const supabase = await createPortalReadClient();

    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, slug, portal_enabled")
      .eq("slug", normalized)
      .maybeSingle();

    if (error) {
      const msg = error.message ?? "Error al buscar el centro.";
      if (
        msg.includes("portal_enabled") ||
        msg.includes("column") ||
        error.code === "42703"
      ) {
        return {
          status: "error",
          message:
            "Falta la migración del portal (0009 / 0011). Ejecutala en Supabase.",
        };
      }
      return { status: "error", message: msg };
    }

    if (!data) {
      return { status: "not_found" };
    }

    if (!data.portal_enabled) {
      return { status: "portal_disabled", name: data.name };
    }

    return { status: "ok", org: data };
  } catch (e) {
    return {
      status: "error",
      message:
        e instanceof Error ? e.message : "No se pudo conectar con la base de datos.",
    };
  }
}
