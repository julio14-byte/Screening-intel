import { NextResponse } from "next/server";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import {
  assertPatientInOrg,
  getUserOrganizationIds,
  kindFromMime,
  listClinicalDocuments,
  mimeOf,
  storeClinicalDocument,
} from "@/lib/documents/clinicalDocuments";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";

export const runtime = "nodejs";
export const maxDuration = 60;

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
    const documents = await listClinicalDocuments(patientId);
    return NextResponse.json({ documents });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al listar documentos." },
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

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido." }, { status: 400 });
  }

  try {
    const orgIds = await getUserOrganizationIds(ctx.user.id);
    const patient = await assertPatientInOrg(patientId, orgIds);
    const kindRaw = formData.get("kind");
    const kind =
      kindRaw === "lab_pdf" ||
      kindRaw === "prescription_photo" ||
      kindRaw === "other"
        ? kindRaw
        : kindFromMime(mimeOf(file));

    const document = await storeClinicalDocument({
      patientId: patient.id,
      clinicId: patient.clinic_id,
      uploadedBy: ctx.user.id,
      file,
      kind,
    });

    await recordCustomAuditEvent({
      tableName: "patients",
      recordId: patient.id,
      description: "Se guardó un documento cifrado en el expediente.",
      userId: ctx.user.id,
      metadata: {
        event_type: "clinical_document_upload",
        document_id: document.id,
        kind: document.kind,
        encryption: document.encryption,
      },
    }).catch(() => undefined);

    return NextResponse.json({ document });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al guardar el documento.";
    const status = /no encontrado|fuera de tu centro/i.test(message)
      ? 404
      : /vacío|supera|Usa PDF|HEIC/i.test(message)
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
