import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";
import {
  cierreContext,
  cierreSchemaErrorResponse,
  forbidUnless,
} from "@/lib/cierre/http";
import { canAnswerCloseoutQuery } from "@/lib/rbac/types";

const schema = z.object({
  id: z.string().uuid(),
  answer_notes: z.string().trim().min(8).max(2000),
});

export async function POST(request: Request) {
  const gate = await cierreContext();
  if (!gate.ok) return gate.response;

  const denied = forbidUnless(
    canAnswerCloseoutQuery(gate.role),
    "El centro (coordinador o investigador) responde la query con el dato o la justificación."
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
      { error: "La respuesta debe tener al menos 8 caracteres." },
      { status: 400 }
    );
  }

  const { data, error } = await gate.supabase
    .from("closeout_queries")
    .update({
      status: "answered",
      answer_notes: parsed.data.answer_notes.trim(),
      answered_by: gate.ctx.user.id,
      answered_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .eq("organization_id", gate.organizationId)
    .eq("status", "open")
    .select("id, status, protocol_id")
    .maybeSingle();

  if (error) return cierreSchemaErrorResponse(error);
  if (!data) {
    return NextResponse.json(
      { error: "La query ya no está abierta." },
      { status: 409 }
    );
  }

  try {
    await recordCustomAuditEvent({
      tableName: "closeout_queries",
      recordId: data.id as string,
      description: "Respuesta a query de limpieza.",
      metadata: { event_type: "closeout_query_answer", protocol_id: data.protocol_id },
    });
  } catch {
    /* bitácora no bloquea */
  }

  return NextResponse.json({ query: data });
}
