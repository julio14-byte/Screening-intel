import { NextResponse } from "next/server";
import {
  AuthorizationError,
  requireAuth,
  requireRole,
} from "@/lib/rbac/require-permission";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/rbac/types";
import {
  CLOSEOUT_MIGRATION_HINT,
  isMissingCloseoutSchema,
} from "./model";

export function cierreSchemaErrorResponse(error: {
  code?: string;
  message?: string;
}) {
  const message = error.message ?? "";
  const missing =
    error.code === "PGRST205" ||
    error.code === "PGRST200" ||
    error.code === "42P01" ||
    error.code === "42703" ||
    /schema cache/i.test(message) ||
    /does not exist/i.test(message) ||
    isMissingCloseoutSchema(message);
  return NextResponse.json(
    { error: missing ? `${message}. ${CLOSEOUT_MIGRATION_HINT}` : message },
    { status: 500 }
  );
}

export async function cierreContext() {
  try {
    const ctx = await requireAuth();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", ctx.user.id)
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        ok: false as const,
        response: NextResponse.json({ error: error.message }, { status: 500 }),
      };
    }
    if (!data?.organization_id) {
      return {
        ok: false as const,
        response: NextResponse.json({ error: "Sin organización." }, { status: 404 }),
      };
    }

    return {
      ok: true as const,
      ctx,
      role: ctx.role as AppRole,
      supabase,
      organizationId: data.organization_id as string,
    };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : 403;
      return {
        ok: false as const,
        response: NextResponse.json({ error: error.message }, { status }),
      };
    }
    throw error;
  }
}

export async function cierreLeadContext() {
  try {
    await requireRole(["investigator", "sub_investigator"]);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : 403;
      return {
        ok: false as const,
        response: NextResponse.json({ error: error.message }, { status }),
      };
    }
    throw error;
  }
  return cierreContext();
}

export function forbidUnless(
  allowed: boolean,
  message: string
): NextResponse | null {
  if (allowed) return null;
  return NextResponse.json({ error: message }, { status: 403 });
}

/** Errores de RPC de cierre: schema ausente → 500; reglas de negocio → 409/400. */
export function cierreActionError(error: { code?: string; message?: string }) {
  const message = error.message ?? "No se pudo completar el cierre.";
  if (
    error.code === "PGRST205" ||
    error.code === "PGRST200" ||
    error.code === "42P01" ||
    error.code === "42703" ||
    isMissingCloseoutSchema(message) ||
    /schema cache|does not exist/i.test(message)
  ) {
    return cierreSchemaErrorResponse(error);
  }
  const conflict =
    /limpia|congelad|ya estaba|después del|antes de|ya fue abierto|ya no se/i.test(
      message
    );
  return NextResponse.json({ error: message }, { status: conflict ? 409 : 400 });
}
