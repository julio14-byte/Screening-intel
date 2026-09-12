import { NextResponse } from "next/server";
import {
  AuthorizationError,
  requireRole,
} from "@/lib/rbac/require-permission";
import {
  listProtocolAssignmentMembers,
  setProtocolAssignment,
} from "@/lib/protocols/protocolAssignments";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";

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
  let ctx;
  try {
    ctx = await requireRole(["investigator"]);
  } catch (e) {
    const denied = authError(e);
    if (denied) return denied;
    throw e;
  }

  const { id } = await params;
  try {
    const result = await listProtocolAssignmentMembers({
      investigatorUserId: ctx.user.id,
      protocolId: id,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al cargar el equipo.";
    const status = /no encontrado/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await requireRole(["investigator"]);
  } catch (e) {
    const denied = authError(e);
    if (denied) return denied;
    throw e;
  }

  const { id } = await params;
  let body: { userId?: string; assigned?: boolean };
  try {
    body = (await request.json()) as { userId?: string; assigned?: boolean };
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body.userId || typeof body.assigned !== "boolean") {
    return NextResponse.json(
      { error: "userId y assigned son requeridos." },
      { status: 400 }
    );
  }

  try {
    await setProtocolAssignment({
      investigatorUserId: ctx.user.id,
      protocolId: id,
      targetUserId: body.userId,
      assigned: body.assigned,
    });

    await recordCustomAuditEvent({
      tableName: "protocols",
      recordId: id,
      description: body.assigned
        ? "Se asignó staff al protocolo."
        : "Se quitó staff del protocolo.",
      userId: ctx.user.id,
      metadata: {
        event_type: "protocol_assignment",
        target_user_id: body.userId,
        assigned: body.assigned,
      },
    }).catch(() => undefined);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al actualizar la asignación.";
    const status = /no encontrado|no pertenece/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
