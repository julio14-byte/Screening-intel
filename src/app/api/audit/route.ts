import { NextResponse } from "next/server";
import {
  fetchAuditLogs,
  recordCustomAuditEvent,
} from "@/lib/audit/record-audit-event";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no configurado" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const tableName = searchParams.get("table_name");
  const recordId = searchParams.get("record_id");
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 100;

  if (!tableName || !recordId) {
    return NextResponse.json(
      { error: "Parámetros requeridos: table_name, record_id" },
      { status: 400 }
    );
  }

  try {
    const logs = await fetchAuditLogs({ tableName, recordId, limit });
    return NextResponse.json({ logs });
  } catch (e) {
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

  const payload = body as {
    tableName?: string;
    recordId?: string;
    description?: string;
    metadata?: Record<string, unknown>;
    userId?: string | null;
  };

  if (!payload.tableName || !payload.recordId || !payload.description) {
    return NextResponse.json(
      {
        error:
          "Campos requeridos: tableName, recordId, description",
      },
      { status: 400 }
    );
  }

  try {
    const auditId = await recordCustomAuditEvent({
      tableName: payload.tableName,
      recordId: payload.recordId,
      description: payload.description,
      metadata: payload.metadata,
      userId: payload.userId,
    });
    return NextResponse.json({ auditId }, { status: 201 });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Error al registrar auditoría";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
