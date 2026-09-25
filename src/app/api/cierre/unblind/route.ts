import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";
import { cierreActionError, cierreLeadContext } from "@/lib/cierre/http";
import { loadProtocolInOrg } from "@/lib/cierre/store";

const schema = z.object({
  protocol_id: z.string().uuid(),
  reason: z.string().trim().min(8).max(500),
});

export async function POST(request: Request) {
  const gate = await cierreLeadContext();
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Indicá el motivo de la apertura del ciego (mínimo 8 caracteres)." },
      { status: 400 }
    );
  }

  const loaded = await loadProtocolInOrg(
    gate.supabase,
    gate.organizationId,
    parsed.data.protocol_id
  );
  if (loaded.error) return loaded.error;

  const { data, error } = await gate.supabase.rpc("closeout_unblind_study", {
    p_protocol_id: parsed.data.protocol_id,
    p_reason: parsed.data.reason,
  });

  if (error) return cierreActionError(error);

  try {
    await recordCustomAuditEvent({
      tableName: "protocol_closeouts",
      recordId: parsed.data.protocol_id,
      description: "Apertura del ciego del estudio (después del Database Lock).",
      metadata: {
        event_type: "closeout_unblind",
        protocol_id: parsed.data.protocol_id,
        reason: parsed.data.reason,
      },
    });
  } catch {
    /* bitácora no bloquea */
  }

  return NextResponse.json({ unblind: data });
}
