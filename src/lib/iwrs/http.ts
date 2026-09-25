import { NextResponse } from "next/server";
import {
  AuthorizationError,
  requireAuth,
  requirePermission,
} from "@/lib/rbac/require-permission";
import { createClient } from "@/lib/supabase/server";
import type { Permission } from "@/lib/rbac/types";
import { isMissingIwrsSchema } from "@/lib/iwrs/model";

const MIGRATION_HINT =
  "Falta aplicar IWRS en Supabase (SQL Editor → 20260924150000_iwrs_randomization.sql y 20260925001000_sponsor_iwrs.sql) y recargar el schema.";

export function iwrsSchemaErrorResponse(error: {
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
    isMissingIwrsSchema(message);
  return NextResponse.json(
    { error: missing ? `${message}. ${MIGRATION_HINT}` : message },
    { status: 500 }
  );
}

export async function iwrsContext(permission: Permission | "auth") {
  try {
    const ctx =
      permission === "auth"
        ? await requireAuth()
        : await requirePermission(permission);
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
