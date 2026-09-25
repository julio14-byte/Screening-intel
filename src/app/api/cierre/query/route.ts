import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";
import {
  cierreContext,
  cierreSchemaErrorResponse,
  forbidUnless,
} from "@/lib/cierre/http";
import { ensureCloseoutRow, loadProtocolInOrg } from "@/lib/cierre/store";
import { canOpenCloseoutQuery } from "@/lib/rbac/types";

const schema = z.object({
  protocol_id: z.string().uuid(),
  patient_id: z.string().uuid().nullable().optional(),
  follow_up_visit_id: z.string().uuid().nullable().optional(),
  field_hint: z.string().trim().max(80).optional(),
  description: z.string().trim().min(8).max(2000),
});

export async function POST(request: Request) {
  const gate = await cierreContext();
  if (!gate.ok) return gate.response;

  const denied = forbidUnless(
    canOpenCloseoutQuery(gate.role),
    "Solo el monitor CRA, el coordinador o el investigador pueden abrir una query de limpieza."
  );
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Describí el dato faltante (mínimo 8 caracteres)." },
      { status: 400 }
    );
  }

  const loaded = await loadProtocolInOrg(
    gate.supabase,
    gate.organizationId,
    parsed.data.protocol_id
  );
  if (loaded.error) return loaded.error;

  const ensured = await ensureCloseoutRow(
    gate.supabase,
    gate.organizationId,
    parsed.data.protocol_id
  );
  if (ensured.error) return ensured.error;
  const closeoutId = ensured.closeout.id;
  if (!closeoutId) {
    return NextResponse.json({ error: "No se pudo iniciar el cierre." }, { status: 500 });
  }
  if (ensured.closeout.phase !== "cleaning") {
    return NextResponse.json(
      { error: "Database Lock: ya no se pueden abrir queries. La base está congelada." },
      { status: 409 }
    );
  }

  const { data, error } = await gate.supabase
    .from("closeout_queries")
    .insert({
      organization_id: gate.organizationId,
      protocol_id: parsed.data.protocol_id,
      closeout_id: closeoutId,
      patient_id: parsed.data.patient_id ?? null,
      follow_up_visit_id: parsed.data.follow_up_visit_id ?? null,
      field_hint: parsed.data.field_hint?.trim() ?? "",
      description: parsed.data.description.trim(),
      opened_by: gate.ctx.user.id,
    })
    .select("id, status, description")
    .maybeSingle();

  if (error) return cierreSchemaErrorResponse(error);
  if (!data) {
    return NextResponse.json({ error: "No se pudo abrir la query." }, { status: 500 });
  }

  try {
    await recordCustomAuditEvent({
      tableName: "closeout_queries",
      recordId: data.id as string,
      description: "Query de limpieza de datos (cierre de base).",
      metadata: {
        event_type: "closeout_query_open",
        protocol_id: parsed.data.protocol_id,
        field_hint: parsed.data.field_hint ?? "",
      },
    });
  } catch {
    /* bitácora no bloquea */
  }

  return NextResponse.json({ query: data });
}
