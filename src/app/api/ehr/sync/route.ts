import { NextResponse } from "next/server";
import { z } from "zod";
import { runEhrBatchSync } from "@/lib/ehr/runBatchSync";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import {
  createSupabaseAdminClient,
  getUser,
  isAuditAdminConfigured,
} from "@/lib/supabase/server";
import { getOrganizationForUser } from "@/plugins/stripe/organization";

const patientSchema = z.object({
  ehr_patient_id: z.string().trim().min(1).max(200),
  first_name: z.string().trim().min(1).max(120),
  last_name: z.string().trim().min(1).max(120),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(["male", "female", "other"]),
  conditions: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  laboratories: z.record(z.string(), z.number()).optional(),
});

const bodySchema = z.object({
  ehr_source: z.string().trim().min(1).max(80).optional(),
  patients: z.array(patientSchema).min(1).max(500),
});

/**
 * Fase 1 — Sync batch desde EHR (1–2 veces al día).
 * Upsert por (clinic_id, ehr_patient_id) y recalcula matching activo.
 */
export async function POST(request: Request) {
  try {
    await requirePermission("patients:write");
  } catch (e) {
    if (e instanceof AuthorizationError) {
      const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }

  if (!isAuditAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Falta SUPABASE_SERVICE_ROLE_KEY para sync EHR (operaciones batch).",
      },
      { status: 503 }
    );
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const org = await getOrganizationForUser(user.id);
  if (!org) {
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
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { logId, stats } = await runEhrBatchSync(admin, {
    organizationId: org.id,
    body: parsed.data,
    triggeredBy: user.id,
    patientLimit: org.patient_limit,
  });

  return NextResponse.json({
    logId,
    created: stats.created,
    updated: stats.updated,
    failed: stats.failed,
    rematchRefreshed: stats.rematchRefreshed,
    errors: stats.errors.slice(0, 10),
  });
}
