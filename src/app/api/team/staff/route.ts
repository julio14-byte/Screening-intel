import { NextResponse } from "next/server";
import { opsContext } from "@/lib/ops/http";
import { AuthorizationError, requirePermission } from "@/lib/rbac/require-permission";
import { STAFF_COLUMNS, staffSchema, TEAM_MIGRATION_HINT } from "@/lib/team/team";

async function guard() {
  try {
    await requirePermission("roles:manage");
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return NextResponse.json(
        { error: e.message },
        { status: e.code === "UNAUTHENTICATED" ? 401 : 403 }
      );
    }
    throw e;
  }
  return null;
}

export async function PUT(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = staffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const { id, email, professional_license, gcp_expires_on, license_expires_on, ...rest } =
    parsed.data;
  const values = {
    ...rest,
    email: email || null,
    professional_license: professional_license || null,
    gcp_expires_on: gcp_expires_on || null,
    license_expires_on: license_expires_on || null,
  };

  const query = id
    ? gate.supabase
        .from("site_staff")
        .update(values)
        .eq("id", id)
        .eq("organization_id", gate.organizationId)
    : gate.supabase
        .from("site_staff")
        .insert({ organization_id: gate.organizationId, ...values });

  const { data, error } = await query.select(STAFF_COLUMNS).maybeSingle();
  if (error) {
    console.error("[team] staff:", error.code ?? "", error.message);
    const missing = error.code === "PGRST205" || error.code === "42P01";
    return NextResponse.json(
      { error: missing ? TEAM_MIGRATION_HINT : "No se pudo guardar a la persona." },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json({ error: "Persona no encontrada." }, { status: 404 });
  }
  return NextResponse.json({ staff: data });
}
