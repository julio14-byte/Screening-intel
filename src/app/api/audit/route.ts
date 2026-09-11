import { NextResponse } from "next/server";
import {
  fetchAuditLogs,
  recordCustomAuditEvent,
} from "@/lib/audit/record-audit-event";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import {
  auditQuerySchema,
  customAuditEventSchema,
  safeParseBody,
} from "@/lib/security/schemas";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no configurado" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = safeParseBody(auditQuerySchema, {
    table_name: searchParams.get("table_name"),
    record_id: searchParams.get("record_id"),
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { table_name: tableName, record_id: recordId, limit = 100 } =
    parsed.data;

  try {
    const logs = await fetchAuditLogs({ tableName, recordId, limit });
    return NextResponse.json({ logs });
  } catch (e) {
    if (e instanceof AuthorizationError) {
      const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: e.message }, { status });
    }
    const message =
      e instanceof Error ? e.message : "Error al consultar auditoría";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no configurado" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = safeParseBody(customAuditEventSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const payload = parsed.data;

  try {
    await requirePermission("audit:write");
    const auditId = await recordCustomAuditEvent({
      tableName: payload.tableName,
      recordId: payload.recordId,
      description: payload.description,
      metadata: payload.metadata,
      userId: payload.userId,
    });
    return NextResponse.json({ auditId }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthorizationError) {
      const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: e.message }, { status });
    }
    const message =
      e instanceof Error ? e.message : "Error al registrar auditoría";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
