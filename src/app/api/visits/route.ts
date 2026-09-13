import { NextResponse } from "next/server";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";
import {
  createStudyVisit,
  listStudyVisits,
  visitCreateSchema,
} from "@/lib/visits/studyVisits";

function authError(e: unknown) {
  if (e instanceof AuthorizationError) {
    const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
    return NextResponse.json({ error: e.message }, { status });
  }
  return null;
}

export async function GET(request: Request) {
  try {
    await requirePermission("screenings:read");
  } catch (e) {
    const denied = authError(e);
    if (denied) return denied;
    throw e;
  }

  const url = new URL(request.url);
  try {
    const visits = await listStudyVisits({
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      patientId: url.searchParams.get("patientId") ?? undefined,
    });
    return NextResponse.json({ visits });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al listar visitas." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requirePermission("screenings:write");
  } catch (e) {
    const denied = authError(e);
    if (denied) return denied;
    throw e;
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = visitCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos de visita inválidos." },
      { status: 400 }
    );
  }

  try {
    const visit = await createStudyVisit({
      userId: ctx.user.id,
      patientId: parsed.data.patientId,
      protocolId: parsed.data.protocolId,
      visitType: parsed.data.visitType,
      scheduledAt: parsed.data.scheduledAt,
      notes: parsed.data.notes,
    });
    await recordCustomAuditEvent({
      tableName: "study_visits",
      recordId: visit.id,
      description: "Se programó una visita.",
      userId: ctx.user.id,
      metadata: {
        event_type: "visit_scheduled",
        patient_id: visit.patient_id,
        protocol_id: visit.protocol_id,
        visit_type: visit.visit_type,
      },
    }).catch(() => undefined);
    return NextResponse.json({ visit });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al crear la visita.";
    const status = /no encontrado|inválida/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
