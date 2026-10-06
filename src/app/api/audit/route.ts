import { NextResponse } from "next/server";
import {
  fetchAuditLogs,
  recordCustomAuditEvent,
} from "@/lib/audit/record-audit-event";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { serverError } from "@/lib/security/http";
import { z } from "zod";

const AUDIT_TABLES = ["patients", "protocols", "screenings", "clinical_profiles"] as const;

const querySchema = z.object({
  table_name: z.enum(AUDIT_TABLES),
  record_id: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const postSchema = z.object({
  tableName: z.enum(AUDIT_TABLES),
  recordId: z.string().uuid(),
  description: z.string().trim().min(1).max(1000),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no configurado" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = querySchema.safeParse({
    table_name: searchParams.get("table_name"),
    record_id: searchParams.get("record_id"),
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!query.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos: table_name, record_id (uuid)." },
      { status: 400 }
    );
  }
  const { table_name: tableName, record_id: recordId, limit } = query.data;

  try {
    const logs = await fetchAuditLogs({ tableName, recordId, limit });
    return NextResponse.json({ logs });
  } catch (e) {
    if (e instanceof AuthorizationError) {
      const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: e.message }, { status });
    }
    return serverError("audit/get", e, "No se pudo consultar la auditoría.");
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

  const parsedPayload = postSchema.safeParse(body);
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: "Campos requeridos: tableName, recordId (uuid), description." },
      { status: 400 }
    );
  }
  const payload = parsedPayload.data;

  try {
    await requirePermission("audit:write");
    const auditId = await recordCustomAuditEvent({
      tableName: payload.tableName,
      recordId: payload.recordId,
      description: payload.description,
      metadata: payload.metadata,
    });
    return NextResponse.json({ auditId }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthorizationError) {
      const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: e.message }, { status });
    }
    return serverError("audit/post", e, "No se pudo registrar la auditoría.");
  }
}
