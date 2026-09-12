import { NextResponse } from "next/server";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import {
  deleteClinicalDocument,
  downloadClinicalDocument,
  getUserOrganizationIds,
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
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  let ctx;
  try {
    ctx = await requirePermission("profiles:read");
  } catch (e) {
    const denied = authError(e);
    if (denied) return denied;
    throw e;
  }

  const { id: patientId, docId } = await params;
  try {
    const orgIds = await getUserOrganizationIds(ctx.user.id);
    const { bytes, row } = await downloadClinicalDocument({
      documentId: docId,
      patientId,
      organizationIds: orgIds,
    });

    await recordCustomAuditEvent({
      tableName: "patients",
      recordId: patientId,
      description: "Se descargó un documento del expediente.",
      userId: ctx.user.id,
      metadata: {
        event_type: "clinical_document_download",
        document_id: row.id,
        kind: row.kind,
      },
    }).catch(() => undefined);

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": row.content_type,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(row.original_filename)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al descargar el documento.";
    const status = /no encontrado|fuera de tu centro/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  let ctx;
  try {
    ctx = await requirePermission("profiles:write");
  } catch (e) {
    const denied = authError(e);
    if (denied) return denied;
    throw e;
  }

  const { id: patientId, docId } = await params;
  try {
    const orgIds = await getUserOrganizationIds(ctx.user.id);
    await deleteClinicalDocument({
      documentId: docId,
      patientId,
      organizationIds: orgIds,
      userId: ctx.user.id,
      isInvestigator: ctx.role === "investigator",
    });

    await recordCustomAuditEvent({
      tableName: "patients",
      recordId: patientId,
      description: "Se eliminó un documento del expediente.",
      userId: ctx.user.id,
      metadata: {
        event_type: "clinical_document_delete",
        document_id: docId,
      },
    }).catch(() => undefined);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al borrar el documento.";
    const status = /no encontrado|fuera de tu centro|Solo el PI/i.test(message)
      ? message.includes("Solo el PI")
        ? 403
        : 404
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
