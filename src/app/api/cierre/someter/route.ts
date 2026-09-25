import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";
import { cierreLeadContext, cierreSchemaErrorResponse } from "@/lib/cierre/http";
import { REGULATORY_AGENCIES, phaseReached } from "@/lib/cierre/model";
import { ensureCloseoutRow, loadProtocolInOrg } from "@/lib/cierre/store";

const schema = z.object({
  protocol_id: z.string().uuid(),
  agencies: z.array(z.enum(REGULATORY_AGENCIES)).min(1),
  notes: z.string().trim().max(2000).optional(),
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
      { error: "Elegí al menos una agencia (FDA, EMA, COFEPRIS o ANMAT)." },
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
    return NextResponse.json({ error: "No hay cierre iniciado." }, { status: 409 });
  }
  if (!phaseReached(ensured.closeout.phase, "csr")) {
    return NextResponse.json(
      { error: "Generá el CSR del centro antes de registrar el sometimiento." },
      { status: 409 }
    );
  }
  if (ensured.closeout.phase === "submitted") {
    return NextResponse.json(
      { error: "El sometimiento ya estaba registrado." },
      { status: 409 }
    );
  }

  const notes =
    parsed.data.notes?.trim() ||
    "Registro interno: el sponsor empaqueta el expediente. Crisvia no envía datos a la agencia.";

  const { data, error } = await gate.supabase
    .from("protocol_closeouts")
    .update({
      phase: "submitted",
      agencies: parsed.data.agencies,
      submission_notes: notes,
      submitted_at: new Date().toISOString(),
      submitted_by: gate.ctx.user.id,
    })
    .eq("id", closeoutId)
    .eq("organization_id", gate.organizationId)
    .select("id, phase, agencies, submitted_at")
    .maybeSingle();

  if (error) return cierreSchemaErrorResponse(error);
  if (!data) {
    return NextResponse.json({ error: "No se pudo registrar el sometimiento." }, { status: 409 });
  }

  try {
    await recordCustomAuditEvent({
      tableName: "protocol_closeouts",
      recordId: closeoutId,
      description:
        "Sometimiento regulatorio registrado (sin envío a FDA/EMA/COFEPRIS/ANMAT).",
      metadata: {
        event_type: "closeout_submit",
        protocol_id: parsed.data.protocol_id,
        agencies: parsed.data.agencies,
      },
    });
  } catch {
    /* bitácora no bloquea */
  }

  return NextResponse.json({
    submission: data,
    phase_iv:
      "Si la agencia aprueba, el medicamento entra a farmacovigilancia abierta (Fase IV). Eso ocurre fuera de Crisvia.",
  });
}
