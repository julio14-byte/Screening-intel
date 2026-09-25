import { NextResponse } from "next/server";
import { z } from "zod";
import { opsContext, opsSchemaErrorResponse } from "@/lib/ops/http";
import {
  FOLLOW_UP_MIGRATION_HINT,
  FOLLOW_UP_STATUSES,
  isMissingFollowUpSchema,
  isWindowOverdue,
  utcToday,
} from "@/lib/follow-up/model";

function schemaError(error: { message?: string }) {
  if (isMissingFollowUpSchema(error.message)) {
    return NextResponse.json(
      { error: `${error.message}. ${FOLLOW_UP_MIGRATION_HINT}` },
      { status: 500 }
    );
  }
  return opsSchemaErrorResponse(error);
}

const SELECT =
  "id, patient_id, protocol_id, arm_id, schedule_id, baseline_on, target_on, window_start_on, window_end_on, scheduled_on, actual_on, status, protocol_deviation, pills_dispensed, pills_returned, adherence_pct, systolic, diastolic, heart_rate, temperature, weight_kg, adverse_event, adverse_event_notes, transport_amount, meals_amount, currency, notes, completed_at, patients(subject_code, first_name, last_name), protocols(code_name), protocol_visit_schedules(visit_code, title, target_day, window_before_days, window_after_days)";

export async function GET(request: Request) {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const url = new URL(request.url);
  const patientId = url.searchParams.get("patient_id");
  const protocolId = url.searchParams.get("protocol_id");

  let query = gate.supabase
    .from("follow_up_visits")
    .select(SELECT)
    .eq("organization_id", gate.organizationId)
    .order("target_on", { ascending: true })
    .limit(200);

  if (patientId) {
    const parsed = z.string().uuid().safeParse(patientId);
    if (!parsed.success) {
      return NextResponse.json({ error: "Paciente inválido." }, { status: 400 });
    }
    query = query.eq("patient_id", parsed.data);
  }
  if (protocolId) {
    const parsed = z.string().uuid().safeParse(protocolId);
    if (!parsed.success) {
      return NextResponse.json({ error: "Protocolo inválido." }, { status: 400 });
    }
    query = query.eq("protocol_id", parsed.data);
  }

  const { data, error } = await query;
  if (error) return schemaError(error);

  const today = utcToday();
  const visits = (data ?? []).map((row) => ({
    ...row,
    overdue:
      row.status === "scheduled" &&
      isWindowOverdue(row.window_end_on as string, today),
  }));

  return NextResponse.json({ visits, today });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(FOLLOW_UP_STATUSES).optional(),
  scheduled_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().trim().max(4000).optional(),
});

export async function PATCH(request: Request) {
  const gate = await opsContext(true);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  if (parsed.data.status && parsed.data.status !== "missed") {
    return NextResponse.json(
      { error: "Para completar usá el formulario de visita (signos vitales obligatorios)." },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.status === "missed") {
    patch.status = "missed";
    patch.protocol_deviation = true;
    patch.completed_by = gate.ctx.user.id;
    patch.completed_at = new Date().toISOString();
  }
  if (parsed.data.scheduled_on) patch.scheduled_on = parsed.data.scheduled_on;
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes;

  const { data, error } = await gate.supabase
    .from("follow_up_visits")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("organization_id", gate.organizationId)
    .eq("status", "scheduled")
    .select("id, status, protocol_deviation")
    .maybeSingle();

  if (error) return schemaError(error);
  if (!data) {
    return NextResponse.json(
      { error: "Solo se puede marcar perdida una visita programada." },
      { status: 404 }
    );
  }
  return NextResponse.json({ visit: data });
}
