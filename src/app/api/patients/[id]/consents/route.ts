import { NextResponse } from "next/server";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";
import {
  consentCreateSchema,
  createInformedConsent,
  listInformedConsents,
} from "@/lib/consent/informedConsents";

function authError(e: unknown) {
  if (e instanceof AuthorizationError) {
    const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
    return NextResponse.json({ error: e.message }, { status });
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("profiles:read");
  } catch (e) {
    const denied = authError(e);
    if (denied) return denied;
    throw e;
  }

  const { id: patientId } = await params;
  try {
    const consents = await listInformedConsents(patientId);
    return NextResponse.json({ consents });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Error al listar consentimientos.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await requirePermission("profiles:write");
  } catch (e) {
    const denied = authError(e);
    if (denied) return denied;
    throw e;
  }

  const { id: patientId } = await params;
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "FormData inválido." }, { status: 400 });
  }

  const parsed = consentCreateSchema.safeParse({
    protocolId: formData.get("protocolId"),
    icfVersion: formData.get("icfVersion"),
    consentedAt: formData.get("consentedAt"),
    notes: formData.get("notes") || null,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Completa protocolo, versión del ICF y fecha." },
      { status: 400 }
    );
  }

  const fileValue = formData.get("file");
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

  try {
    const consent = await createInformedConsent({
      userId: ctx.user.id,
      patientId,
      protocolId: parsed.data.protocolId,
      icfVersion: parsed.data.icfVersion,
      consentedAt: parsed.data.consentedAt,
      notes: parsed.data.notes,
      file,
    });
    await recordCustomAuditEvent({
      tableName: "informed_consents",
      recordId: consent.id,
      description: `Se registró consentimiento informado (versión ${consent.icf_version}).`,
      userId: ctx.user.id,
      metadata: {
        event_type: "icf_obtained",
        patient_id: patientId,
        protocol_id: consent.protocol_id,
        icf_version: consent.icf_version,
        document_id: consent.document_id,
      },
    }).catch(() => undefined);
    return NextResponse.json({ consent });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al guardar el ICF.";
    const status = /Ya existe|inválida|Usa PDF|vacío|supera/i.test(message)
      ? 400
      : /no encontrado|fuera de tu centro/i.test(message)
        ? 404
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
