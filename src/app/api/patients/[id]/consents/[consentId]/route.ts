import { NextResponse } from "next/server";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";
import { withdrawInformedConsent } from "@/lib/consent/informedConsents";

function authError(e: unknown) {
  if (e instanceof AuthorizationError) {
    const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
    return NextResponse.json({ error: e.message }, { status });
  }
  return null;
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string; consentId: string }> }
) {
  let ctx;
  try {
    ctx = await requirePermission("profiles:write");
  } catch (e) {
    const denied = authError(e);
    if (denied) return denied;
    throw e;
  }

  const { id: patientId, consentId } = await params;
  try {
    const consent = await withdrawInformedConsent(patientId, consentId);
    await recordCustomAuditEvent({
      tableName: "informed_consents",
      recordId: consent.id,
      description: "Se marcó el consentimiento informado como retirado.",
      userId: ctx.user.id,
      metadata: {
        event_type: "icf_withdrawn",
        patient_id: patientId,
        protocol_id: consent.protocol_id,
      },
    }).catch(() => undefined);
    return NextResponse.json({ consent });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al actualizar el ICF.";
    const status = /no encontrado/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
