import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AuthorizationError,
  requireAuth,
  requirePermission,
} from "@/lib/rbac/require-permission";
import {
  createClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";

const patchSchema = z.object({
  ehr_source: z.string().trim().min(1).max(80).optional(),
});

async function getMembershipOrgId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return data?.organization_id ?? null;
}

export async function GET() {
  try {
    await requirePermission("patients:write");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }
    throw error;
  }

  const { user } = await requireAuth();
  const orgId = await getMembershipOrgId(user.id);
  if (!orgId) {
    return NextResponse.json({ error: "Sin organización." }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const { data: org, error } = await admin
    .from("organizations")
    .select("id, name, ehr_source")
    .eq("id", orgId)
    .single();

  if (error || !org) {
    return NextResponse.json({ error: "Organización no encontrada." }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("ehr_sync_logs")
    .select(
      "id, sync_type, status, patients_created, patients_updated, patients_failed, rematch_refreshed, started_at, completed_at"
    )
    .eq("organization_id", orgId)
    .order("started_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    organization: {
      id: org.id,
      name: org.name,
      ehr_source: org.ehr_source,
    },
    recentLogs: logs ?? [],
  });
}

export async function PATCH(request: Request) {
  try {
    await requirePermission("roles:manage");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join("; ") },
      { status: 400 }
    );
  }

  const { user } = await requireAuth();
  const orgId = await getMembershipOrgId(user.id);
  if (!orgId) {
    return NextResponse.json({ error: "Sin organización." }, { status: 404 });
  }

  if (!parsed.data.ehr_source) {
    return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: org, error } = await admin
    .from("organizations")
    .update({ ehr_source: parsed.data.ehr_source })
    .eq("id", orgId)
    .select("id, name, ehr_source")
    .single();

  if (error || !org) {
    return NextResponse.json(
      { error: error?.message ?? "No se pudo guardar." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    organization: {
      id: org.id,
      name: org.name,
      ehr_source: org.ehr_source,
    },
  });
}
