import { NextResponse } from "next/server";
import { z } from "zod";
import { opsContext, opsSchemaErrorResponse } from "@/lib/ops/http";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";
import {
  FOLLOW_UP_MIGRATION_HINT,
  adherencePercent,
  isMissingFollowUpSchema,
  reimbursementTotal,
  statusAfterActualDate,
} from "@/lib/follow-up/model";

const schema = z.object({
  id: z.string().uuid(),
  actual_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  systolic: z.number().int().min(60).max(260),
  diastolic: z.number().int().min(30).max(160),
  heart_rate: z.number().int().min(20).max(250),
  temperature: z.number().min(32).max(43).optional().nullable(),
  weight_kg: z.number().min(1).max(400).optional().nullable(),
  pills_dispensed: z.number().int().min(0).max(10000),
  pills_returned: z.number().int().min(0).max(10000),
  adverse_event: z.boolean(),
  adverse_event_notes: z.string().trim().max(2000).optional(),
  transport_amount: z.number().min(0).max(1_000_000).default(0),
  meals_amount: z.number().min(0).max(1_000_000).default(0),
  currency: z.enum(["ARS", "USD", "MXN", "CLP", "COP", "EUR", "BRL"]).default("ARS"),
  notes: z.string().trim().max(4000).optional(),
});

function schemaError(error: { message?: string }) {
  if (isMissingFollowUpSchema(error.message)) {
    return NextResponse.json(
      { error: `${error.message}. ${FOLLOW_UP_MIGRATION_HINT}` },
      { status: 500 }
    );
  }
  return opsSchemaErrorResponse(error);
}

export async function POST(request: Request) {
  const gate = await opsContext(true);
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
      { error: "Completá signos vitales, conteo de pastillas y fecha real." },
      { status: 400 }
    );
  }
  if (parsed.data.pills_returned > parsed.data.pills_dispensed) {
    return NextResponse.json(
      { error: "Las pastillas devueltas no pueden superar las entregadas." },
      { status: 400 }
    );
  }
  if (parsed.data.adverse_event && !parsed.data.adverse_event_notes?.trim()) {
    return NextResponse.json(
      { error: "Si hubo evento adverso, describilo." },
      { status: 400 }
    );
  }

  const { data: current, error: loadError } = await gate.supabase
    .from("follow_up_visits")
    .select(
      "id, patient_id, status, window_start_on, window_end_on, protocol_visit_schedules(visit_code, title)"
    )
    .eq("id", parsed.data.id)
    .eq("organization_id", gate.organizationId)
    .maybeSingle();
  if (loadError) return schemaError(loadError);
  if (!current || current.status !== "scheduled") {
    return NextResponse.json(
      { error: "Esta visita ya no está programada." },
      { status: 409 }
    );
  }

  const outcome = statusAfterActualDate(
    parsed.data.actual_on,
    current.window_start_on as string,
    current.window_end_on as string
  );
  const adherence = adherencePercent(
    parsed.data.pills_dispensed,
    parsed.data.pills_returned
  );

  const { data, error } = await gate.supabase
    .from("follow_up_visits")
    .update({
      actual_on: parsed.data.actual_on,
      status: outcome.status,
      protocol_deviation: outcome.protocolDeviation,
      systolic: parsed.data.systolic,
      diastolic: parsed.data.diastolic,
      heart_rate: parsed.data.heart_rate,
      temperature: parsed.data.temperature ?? null,
      weight_kg: parsed.data.weight_kg ?? null,
      pills_dispensed: parsed.data.pills_dispensed,
      pills_returned: parsed.data.pills_returned,
      adverse_event: parsed.data.adverse_event,
      adverse_event_notes: parsed.data.adverse_event_notes?.trim() ?? "",
      transport_amount: parsed.data.transport_amount,
      meals_amount: parsed.data.meals_amount,
      currency: parsed.data.currency,
      notes: parsed.data.notes?.trim() ?? "",
      completed_by: gate.ctx.user.id,
      completed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .eq("organization_id", gate.organizationId)
    .eq("status", "scheduled")
    .select("id, status, protocol_deviation, adherence_pct, actual_on")
    .maybeSingle();

  if (error) return schemaError(error);
  if (!data) {
    return NextResponse.json({ error: "No se pudo completar la visita." }, { status: 409 });
  }

  try {
    await recordCustomAuditEvent({
      tableName: "follow_up_visits",
      recordId: data.id as string,
      description: outcome.protocolDeviation
        ? "Visita de seguimiento fuera de ventana (desviación de protocolo)."
        : "Visita de seguimiento completada dentro de ventana.",
      metadata: {
        event_type: "follow_up_complete",
        action: "UPDATE",
        status: data.status,
        protocol_deviation: data.protocol_deviation,
        actual_on: parsed.data.actual_on,
        adherence_pct: adherence,
        adverse_event: parsed.data.adverse_event,
        reimbursement: reimbursementTotal(
          parsed.data.transport_amount,
          parsed.data.meals_amount
        ),
        patient_id: current.patient_id,
      },
    });
  } catch {
    // Captura clínica ya guardada.
  }

  return NextResponse.json({
    visit: data,
    protocol_deviation: data.protocol_deviation,
    adherence_pct: data.adherence_pct ?? adherence,
  });
}
