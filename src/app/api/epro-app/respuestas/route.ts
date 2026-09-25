import { NextResponse } from "next/server";
import { opsContext, opsSchemaErrorResponse } from "@/lib/ops/http";
import { EPRO_MIGRATION_HINT, isMissingEproMobileSchema } from "@/lib/epro-app/crypto";

export async function GET(request: Request) {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const patientId = new URL(request.url).searchParams.get("patient_id");
  let query = gate.supabase
    .from("epro_daily_answers")
    .select(
      "id, patient_id, form_id, answered_on, answers, submitted_at, epro_forms(title)"
    )
    .eq("organization_id", gate.organizationId)
    .order("answered_on", { ascending: false })
    .limit(60);

  if (patientId) query = query.eq("patient_id", patientId);

  const { data, error } = await query;
  if (error) {
    if (isMissingEproMobileSchema(error.message)) {
      return NextResponse.json({ entries: [], hint: EPRO_MIGRATION_HINT });
    }
    return opsSchemaErrorResponse(error);
  }

  let activatedAt: string | null = null;
  let locked = false;
  if (patientId) {
    const { data: status } = await gate.supabase.rpc("epro_activation_status", {
      p_patient_id: patientId,
    });
    const row = Array.isArray(status) ? status[0] : status;
    activatedAt = (row as { activated_at?: string } | null)?.activated_at ?? null;
    locked = Boolean((row as { locked?: boolean } | null)?.locked);
  }

  return NextResponse.json({
    entries: data ?? [],
    activated_at: activatedAt,
    locked,
  });
}
