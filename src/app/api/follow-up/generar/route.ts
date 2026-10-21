import { NextResponse } from "next/server";
import { z } from "zod";
import { opsContext, opsSchemaErrorResponse } from "@/lib/ops/http";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";
import {
  FOLLOW_UP_MIGRATION_HINT,
  isMissingFollowUpSchema,
  visitWindow,
} from "@/lib/follow-up/model";

const schema = z.object({
  patient_id: z.string().uuid(),
  protocol_id: z.string().uuid(),
  baseline_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function schemaError(error: { message?: string }) {
  if (isMissingFollowUpSchema(error.message)) {
    return NextResponse.json(
      { error: FOLLOW_UP_MIGRATION_HINT },
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
    return NextResponse.json({ error: "Paciente o protocolo inválido." }, { status: 400 });
  }

  const { data: patient, error: patientError } = await gate.supabase
    .from("patients")
    .select("id, subject_code")
    .eq("id", parsed.data.patient_id)
    .eq("clinic_id", gate.organizationId)
    .maybeSingle();
  if (patientError) return schemaError(patientError);
  if (!patient) {
    return NextResponse.json({ error: "Paciente fuera de tu centro." }, { status: 404 });
  }

  const { data: protocol, error: protocolError } = await gate.supabase
    .from("protocols")
    .select("id")
    .eq("id", parsed.data.protocol_id)
    .eq("clinic_id", gate.organizationId)
    .maybeSingle();
  if (protocolError) return schemaError(protocolError);
  if (!protocol) {
    return NextResponse.json({ error: "Protocolo fuera de tu centro." }, { status: 404 });
  }

  let baselineOn = parsed.data.baseline_on ?? null;
  if (!baselineOn) {
    const screening = await gate.supabase
      .from("screenings")
      .select("medication_delivered_on, updated_at")
      .eq("patient_id", parsed.data.patient_id)
      .eq("protocol_id", parsed.data.protocol_id)
      .eq("status", "randomized")
      .maybeSingle();
    if (screening.error && /medication_delivered_on/i.test(screening.error.message)) {
      const legacy = await gate.supabase
        .from("screenings")
        .select("updated_at")
        .eq("patient_id", parsed.data.patient_id)
        .eq("protocol_id", parsed.data.protocol_id)
        .eq("status", "randomized")
        .maybeSingle();
      if (legacy.error) return schemaError(legacy.error);
      if (legacy.data?.updated_at) baselineOn = String(legacy.data.updated_at).slice(0, 10);
    } else if (screening.error) {
      return schemaError(screening.error);
    } else if (screening.data?.medication_delivered_on) {
      baselineOn = String(screening.data.medication_delivered_on).slice(0, 10);
    } else if (screening.data?.updated_at) {
      baselineOn = String(screening.data.updated_at).slice(0, 10);
    }
  }
  if (!baselineOn) {
    return NextResponse.json(
      {
        error:
          "Falta el día 0. Anota la fecha de entrega en Dispensación, marca al paciente como Randomizado o indica la fecha del día 0.",
      },
      { status: 400 }
    );
  }

  const { data: schedules, error: scheduleError } = await gate.supabase
    .from("protocol_visit_schedules")
    .select(
      "id, arm_id, visit_code, title, target_day, window_before_days, window_after_days, sort_order"
    )
    .eq("organization_id", gate.organizationId)
    .eq("protocol_id", parsed.data.protocol_id)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (scheduleError) return schemaError(scheduleError);

  const applicable = (schedules ?? []).filter((row) => !row.arm_id);
  if (applicable.length === 0) {
    return NextResponse.json(
      { error: "Este protocolo no tiene calendario de seguimiento. Cárgalo en el protocolo." },
      { status: 400 }
    );
  }

  const rows = applicable.map((schedule) => {
    const window = visitWindow({
      baselineOn,
      targetDay: Number(schedule.target_day),
      windowBeforeDays: Number(schedule.window_before_days),
      windowAfterDays: Number(schedule.window_after_days),
    });
    return {
      organization_id: gate.organizationId,
      patient_id: parsed.data.patient_id,
      protocol_id: parsed.data.protocol_id,
      arm_id: null,
      schedule_id: schedule.id,
      baseline_on: baselineOn,
      target_on: window.targetOn,
      window_start_on: window.windowStartOn,
      window_end_on: window.windowEndOn,
      scheduled_on: window.targetOn,
      status: "scheduled",
    };
  });

  const { data, error } = await gate.supabase
    .from("follow_up_visits")
    .upsert(rows, { onConflict: "patient_id,schedule_id", ignoreDuplicates: true })
    .select("id");

  if (error) return schemaError(error);

  try {
    await recordCustomAuditEvent({
      tableName: "patients",
      recordId: parsed.data.patient_id,
      description: "Se generó el calendario de visitas de seguimiento.",
      metadata: {
        event_type: "follow_up_generate",
        protocol_id: parsed.data.protocol_id,
        baseline_on: baselineOn,
        created: data?.length ?? 0,
        subject_code: patient.subject_code ?? null,
      },
    });
  } catch {
    // La visita se generó; la bitácora no debe bloquear al coordinador.
  }

  return NextResponse.json({
    created: data?.length ?? 0,
    baseline_on: baselineOn,
    arm_id: null,
  });
}
