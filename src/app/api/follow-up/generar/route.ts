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
      { error: `${error.message}. ${FOLLOW_UP_MIGRATION_HINT}` },
      { status: 500 }
    );
  }
  return opsSchemaErrorResponse(error);
}

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
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

  const { data: randomization } = await gate.supabase
    .from("iwrs_randomizations")
    .select("id, randomized_at, iwrs_arm_assignments(arm_id)")
    .eq("patient_id", parsed.data.patient_id)
    .eq("protocol_id", parsed.data.protocol_id)
    .eq("organization_id", gate.organizationId)
    .order("randomized_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const armRel = firstRel(
    randomization?.iwrs_arm_assignments as
      | { arm_id?: string }
      | { arm_id?: string }[]
      | null
  );
  const armId = armRel?.arm_id ?? null;

  let baselineOn = parsed.data.baseline_on ?? null;
  if (!baselineOn && randomization?.randomized_at) {
    baselineOn = String(randomization.randomized_at).slice(0, 10);
  }
  if (!baselineOn) {
    const { data: rx } = await gate.supabase
      .from("prescriptions")
      .select("first_dose_at")
      .eq("patient_id", parsed.data.patient_id)
      .eq("protocol_id", parsed.data.protocol_id)
      .not("first_dose_at", "is", null)
      .order("first_dose_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (rx?.first_dose_at) baselineOn = String(rx.first_dose_at).slice(0, 10);
  }
  if (!baselineOn) {
    return NextResponse.json(
      {
        error:
          "Falta el día 0. Randomizá en IWRS, registrá la primera dosis o indicá la fecha baseline.",
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

  const applicable = (schedules ?? []).filter(
    (row) => !row.arm_id || (armId && row.arm_id === armId)
  );
  if (applicable.length === 0) {
    return NextResponse.json(
      { error: "Este protocolo no tiene calendario de seguimiento. Cargalo en el protocolo." },
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
      arm_id: armId,
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
    arm_id: armId,
  });
}
