import { NextResponse } from "next/server";
import { AuthorizationError, requirePermission } from "@/lib/rbac/require-permission";
import { opsContext } from "@/lib/ops/http";
import {
  SITE_MIGRATION_HINT,
  SITE_PROFILE_COLUMNS,
  siteProfileFromRow,
  siteProfileSchema,
} from "@/lib/site/profile";

function schemaMissing(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /schema cache|does not exist/i.test(error.message ?? "")
  );
}

export async function GET() {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const { data, error } = await gate.supabase
    .from("site_profiles")
    .select(SITE_PROFILE_COLUMNS)
    .eq("organization_id", gate.organizationId)
    .maybeSingle();

  if (error) {
    console.error("[site-profile] read:", error.code ?? "", error.message);
    return NextResponse.json(
      {
        error: schemaMissing(error)
          ? SITE_MIGRATION_HINT
          : "No se pudieron cargar los datos del centro.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ profile: siteProfileFromRow(data as never) });
}

export async function PUT(request: Request) {
  try {
    await requirePermission("roles:manage");
  } catch (e) {
    if (e instanceof AuthorizationError) {
      const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }

  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = siteProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const values = Object.fromEntries(
    Object.entries(parsed.data).map(([key, value]) => [key, value === "" ? null : value])
  );

  const { data, error } = await gate.supabase
    .from("site_profiles")
    .upsert(
      { organization_id: gate.organizationId, ...values },
      { onConflict: "organization_id" }
    )
    .select(SITE_PROFILE_COLUMNS)
    .single();

  if (error) {
    console.error("[site-profile] save:", error.code ?? "", error.message);
    return NextResponse.json(
      {
        error: schemaMissing(error)
          ? SITE_MIGRATION_HINT
          : "No se pudieron guardar los datos del centro.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ profile: siteProfileFromRow(data as never) });
}
