import { NextResponse } from "next/server";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";
import {
  deleteStudyVisit,
  updateStudyVisit,
  visitPatchSchema,
} from "@/lib/visits/studyVisits";

function authError(e: unknown) {
  if (e instanceof AuthorizationError) {
    const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
    return NextResponse.json({ error: e.message }, { status });
  }
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await requirePermission("screenings:write");
  } catch (e) {
    const denied = authError(e);
    if (denied) return denied;
    throw e;
  }

  const { id } = await params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = visitPatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos de visita inválidos." },
      { status: 400 }
    );
  }

  try {
    const visit = await updateStudyVisit(id, parsed.data);
    await recordCustomAuditEvent({
      tableName: "study_visits",
      recordId: visit.id,
      description: "Se actualizó una visita.",
      userId: ctx.user.id,
      metadata: {
        event_type: "visit_updated",
        status: visit.status,
        visit_type: visit.visit_type,
      },
    }).catch(() => undefined);
    return NextResponse.json({ visit });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al actualizar la visita.";
    const status = /no encontrada|inválida/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await requirePermission("screenings:write");
  } catch (e) {
    const denied = authError(e);
    if (denied) return denied;
    throw e;
  }

  const { id } = await params;
  try {
    await deleteStudyVisit(id);
    await recordCustomAuditEvent({
      tableName: "study_visits",
      recordId: id,
      description: "Se eliminó una visita de la agenda.",
      userId: ctx.user.id,
      metadata: { event_type: "visit_deleted" },
    }).catch(() => undefined);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al borrar la visita.";
    const status = /no encontrada/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
