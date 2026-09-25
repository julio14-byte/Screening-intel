import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";
import { cierreActionError, cierreLeadContext } from "@/lib/cierre/http";
import { loadProtocolInOrg } from "@/lib/cierre/store";

const schema = z.object({
  protocol_id: z.string().uuid(),
  attestation: z.string().trim().min(20).max(2000),
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
      { error: "La declaración de bloqueo debe tener al menos 20 caracteres." },
      { status: 400 }
    );
  }

  const loaded = await loadProtocolInOrg(
    gate.supabase,
    gate.organizationId,
    parsed.data.protocol_id
  );
  if (loaded.error) return loaded.error;

  const { data, error } = await gate.supabase.rpc("closeout_lock", {
    p_protocol_id: parsed.data.protocol_id,
    p_attestation: parsed.data.attestation,
  });

  if (error) return cierreActionError(error);

  try {
    await recordCustomAuditEvent({
      tableName: "protocol_closeouts",
      recordId: parsed.data.protocol_id,
      description: "Database Lock: base del protocolo congelada.",
      metadata: {
        event_type: "closeout_lock",
        protocol_id: parsed.data.protocol_id,
      },
    });
  } catch {
    /* bitácora no bloquea */
  }

  return NextResponse.json({ lock: data });
}
