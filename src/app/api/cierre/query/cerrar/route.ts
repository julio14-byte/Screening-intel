import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";
import {
  cierreContext,
  cierreSchemaErrorResponse,
  forbidUnless,
} from "@/lib/cierre/http";
import { canCloseCloseoutQuery } from "@/lib/rbac/types";

const schema = z.object({
  id: z.string().uuid(),
});

export async function POST(request: Request) {
  const gate = await cierreContext();
  if (!gate.ok) return gate.response;

  const denied = forbidUnless(
    canCloseCloseoutQuery(gate.role),
    "El monitor CRA (o el investigador) cierra la query cuando el dato está limpio."
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
    return NextResponse.json({ error: "Query inválida." }, { status: 400 });
  }

  const { data, error } = await gate.supabase
    .from("closeout_queries")
    .update({
      status: "closed",
      closed_by: gate.ctx.user.id,
      closed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .eq("organization_id", gate.organizationId)
    .in("status", ["open", "answered"])
    .select("id, status, protocol_id")
    .maybeSingle();

  if (error) return cierreSchemaErrorResponse(error);
  if (!data) {
    return NextResponse.json({ error: "La query ya estaba cerrada." }, { status: 409 });
  }

  try {
    await recordCustomAuditEvent({
      tableName: "closeout_queries",
      recordId: data.id as string,
      description: "Query de limpieza cerrada.",
      metadata: { event_type: "closeout_query_close", protocol_id: data.protocol_id },
    });
  } catch {
    /* bitácora no bloquea */
  }

  return NextResponse.json({ query: data });
}
