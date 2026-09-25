import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";
import { cierreLeadContext, cierreSchemaErrorResponse } from "@/lib/cierre/http";
import {
  buildCsrMarkdown,
  phaseReached,
  type AnalysisSnapshot,
} from "@/lib/cierre/model";
import { ensureCloseoutRow, loadProtocolInOrg } from "@/lib/cierre/store";

const schema = z.object({
  protocol_id: z.string().uuid(),
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
    return NextResponse.json({ error: "Protocolo inválido." }, { status: 400 });
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
  if (!phaseReached(ensured.closeout.phase, "analyzed")) {
    return NextResponse.json(
      { error: "Generá el análisis descriptivo antes del CSR." },
      { status: 409 }
    );
  }

  const snapshot = ensured.closeout.analysis_snapshot as AnalysisSnapshot;
  if (!snapshot || !("n_randomized" in snapshot)) {
    return NextResponse.json(
      { error: "No hay snapshot de análisis. Ejecutá el paso 4." },
      { status: 409 }
    );
  }

  const { data: queries, error: queryError } = await gate.supabase
    .from("closeout_queries")
    .select("status, description, answer_notes")
    .eq("protocol_id", parsed.data.protocol_id)
    .eq("organization_id", gate.organizationId)
    .order("opened_at", { ascending: true });
  if (queryError) return cierreSchemaErrorResponse(queryError);

  const markdown = buildCsrMarkdown({
    protocolCode: loaded.protocol.code_name as string,
    protocolTitle: loaded.protocol.title as string,
    closeout: ensured.closeout,
    snapshot,
    queries: (queries ?? []) as Array<{
      status: string;
      description: string;
      answer_notes: string;
    }>,
    deviations: snapshot.overall_deviations,
  });

  const nextPhase = ensured.closeout.phase === "analyzed" ? "csr" : ensured.closeout.phase;

  const { data, error } = await gate.supabase
    .from("protocol_closeouts")
    .update({
      phase: nextPhase,
      csr_markdown: markdown,
      csr_generated_at: new Date().toISOString(),
    })
    .eq("id", closeoutId)
    .eq("organization_id", gate.organizationId)
    .select("id, phase, csr_generated_at")
    .maybeSingle();

  if (error) return cierreSchemaErrorResponse(error);
  if (!data) {
    return NextResponse.json({ error: "No se pudo generar el CSR." }, { status: 409 });
  }

  try {
    await recordCustomAuditEvent({
      tableName: "protocol_closeouts",
      recordId: closeoutId,
      description: "Borrador de CSR del centro (no es envío a agencias).",
      metadata: { event_type: "closeout_csr", protocol_id: parsed.data.protocol_id },
    });
  } catch {
    /* bitácora no bloquea */
  }

  return NextResponse.json({ csr: { ...data, markdown } });
}
