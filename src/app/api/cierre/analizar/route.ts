import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";
import { cierreLeadContext, cierreSchemaErrorResponse } from "@/lib/cierre/http";
import { buildAnalysisSnapshot, phaseReached } from "@/lib/cierre/model";
import { ensureCloseoutRow, loadProtocolInOrg } from "@/lib/cierre/store";

const schema = z.object({
  protocol_id: z.string().uuid(),
});

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

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
  if (!phaseReached(ensured.closeout.phase, "unblinded")) {
    return NextResponse.json(
      { error: "El análisis es después de bloquear la base y abrir el ciego." },
      { status: 409 }
    );
  }

  const { data: screenings, error: screeningError } = await gate.supabase
    .from("screenings")
    .select("status")
    .eq("protocol_id", parsed.data.protocol_id);
  if (screeningError) return cierreSchemaErrorResponse(screeningError);

  const { data: assignments, error: assignmentError } = await gate.supabase
    .from("iwrs_randomizations")
    .select(
      "id, patient_id, unblinded_at, iwrs_arm_assignments(arm_id, protocol_arms(code, name))"
    )
    .eq("protocol_id", parsed.data.protocol_id)
    .eq("organization_id", gate.organizationId);
  if (assignmentError) return cierreSchemaErrorResponse(assignmentError);

  const { data: visits, error: visitError } = await gate.supabase
    .from("follow_up_visits")
    .select("patient_id, status, adverse_event, adherence_pct, protocol_deviation")
    .eq("protocol_id", parsed.data.protocol_id)
    .eq("organization_id", gate.organizationId);
  if (visitError) return cierreSchemaErrorResponse(visitError);

  const snapshot = buildAnalysisSnapshot({
    screenFailures: (screenings ?? []).filter((row) => row.status === "screen_failure")
      .length,
    assignments: (assignments ?? []).map((row) => {
      const assignment = firstRel(
        row.iwrs_arm_assignments as
          | { protocol_arms: { code: string; name: string } | { code: string; name: string }[] | null }
          | { protocol_arms: { code: string; name: string } | { code: string; name: string }[] | null }[]
          | null
      );
      const arm = firstRel(assignment?.protocol_arms ?? null);
      return {
        patientId: row.patient_id as string,
        armCode: arm?.code ?? "ciego",
        armName: arm?.name ?? (row.unblinded_at ? "Brazo no visible" : "Aún ciego"),
      };
    }),
    visits: (visits ?? []).map((row) => ({
      patientId: row.patient_id as string,
      status: row.status as string,
      adverseEvent: Boolean(row.adverse_event),
      adherencePct: row.adherence_pct == null ? null : Number(row.adherence_pct),
      protocolDeviation: Boolean(row.protocol_deviation),
    })),
  });

  const nextPhase =
    ensured.closeout.phase === "unblinded" ? "analyzed" : ensured.closeout.phase;

  const { data, error } = await gate.supabase
    .from("protocol_closeouts")
    .update({
      phase: nextPhase,
      analysis_snapshot: snapshot,
      analyzed_at: new Date().toISOString(),
      analyzed_by: gate.ctx.user.id,
    })
    .eq("id", closeoutId)
    .eq("organization_id", gate.organizationId)
    .select("id, phase, analyzed_at, analysis_snapshot")
    .maybeSingle();

  if (error) return cierreSchemaErrorResponse(error);
  if (!data) {
    return NextResponse.json({ error: "No se pudo guardar el análisis." }, { status: 409 });
  }

  try {
    await recordCustomAuditEvent({
      tableName: "protocol_closeouts",
      recordId: closeoutId,
      description: "Snapshot descriptivo de cierre (no es SAS/R).",
      metadata: {
        event_type: "closeout_analyze",
        protocol_id: parsed.data.protocol_id,
        n_randomized: snapshot.n_randomized,
      },
    });
  } catch {
    /* bitácora no bloquea */
  }

  return NextResponse.json({ analysis: data });
}
