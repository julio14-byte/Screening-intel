import { NextResponse } from "next/server";
import { z } from "zod";
import { runEhrBatchSync } from "@/lib/ehr/runBatchSync";
import type { EhrPatientPayload } from "@/lib/ehr/types";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import {
  createClient,
  createSupabaseAdminClient,
  getUser,
  isAuditAdminConfigured,
} from "@/lib/supabase/server";

const bodySchema = z.object({
  logId: z.string().uuid(),
  action: z.enum(["ack", "retry"]),
});

async function orgIdForUser(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return data?.organization_id as string | undefined;
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

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const organizationId = await orgIdForUser(user.id);
  if (!organizationId) {
    return NextResponse.json({ error: "Sin organización." }, { status: 404 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ehr_sync_logs")
    .select(
      "id, sync_type, status, patients_failed, error_details, failed_patients, started_at"
    )
    .eq("organization_id", organizationId)
    .in("status", ["failed", "partial"])
    .is("acknowledged_at", null)
    .order("started_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const failures = (data ?? []).map((row) => ({
    id: row.id,
    sync_type: row.sync_type,
    status: row.status,
    patients_failed: row.patients_failed,
    errors: Array.isArray(row.error_details) ? row.error_details.slice(0, 5) : [],
    canRetry: Array.isArray(row.failed_patients) && row.failed_patients.length > 0,
    started_at: row.started_at,
  }));

  return NextResponse.json({ failures });
}

export async function POST(request: Request) {
  try {
    await requirePermission("patients:write");
  } catch (error) {
    if (error instanceof AuthorizationError) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }
    throw error;
  }

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const organizationId = await orgIdForUser(user.id);
  if (!organizationId) {
    return NextResponse.json({ error: "Sin organización." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: log, error } = await supabase
    .from("ehr_sync_logs")
    .select("id, failed_patients, acknowledged_at")
    .eq("id", parsed.data.logId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!log) return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });

  if (parsed.data.action === "ack") {
    const { error: ackError } = await supabase
      .from("ehr_sync_logs")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("id", log.id);
    if (ackError) return NextResponse.json({ error: ackError.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const patients = (log.failed_patients ?? []) as EhrPatientPayload[];
  if (!Array.isArray(patients) || patients.length === 0) {
    return NextResponse.json(
      { error: "Este fallo no guardó pacientes para reintentar. Vuelve a enviar el lote." },
      { status: 409 }
    );
  }

  if (!isAuditAdminConfigured()) {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY para reintentar el sync." },
      { status: 503 }
    );
  }

  const admin = createSupabaseAdminClient();
  const result = await runEhrBatchSync(admin, {
    organizationId,
    body: { patients },
    triggeredBy: user.id,
  });

  await supabase
    .from("ehr_sync_logs")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", log.id);

  return NextResponse.json({
    ok: true,
    logId: result.logId,
    failed: result.stats.failed,
    created: result.stats.created,
    updated: result.stats.updated,
  });
}
