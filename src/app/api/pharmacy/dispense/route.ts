import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";
import { opsContext, opsSchemaErrorResponse } from "@/lib/ops/http";
import {
  DELIVERY_MIGRATION_HINT,
  isMissingDeliveryColumn,
  isPlausibleDeliveryDate,
} from "@/lib/pharmacy/delivery";
import { firstEmbedded } from "@/lib/supabase/embed";

const saveSchema = z.object({
  patient_id: z.string().uuid(),
  protocol_id: z.string().uuid(),
  delivered_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

const SCREENING_COLUMNS =
  "id, patient_id, protocol_id, updated_at, medication_delivered_on, patients!inner(first_name, last_name, subject_code, clinic_id), protocols(code_name, title)";

function deliveryColumnMissing(error: { message?: string } | null) {
  return isMissingDeliveryColumn(error?.message);
}

export async function GET() {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const { data, error } = await gate.supabase
    .from("screenings")
    .select(SCREENING_COLUMNS)
    .eq("status", "randomized")
    .eq("patients.clinic_id", gate.organizationId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    if (deliveryColumnMissing(error)) {
      return NextResponse.json({ error: DELIVERY_MIGRATION_HINT }, { status: 500 });
    }
    return opsSchemaErrorResponse(error);
  }

  const rows = (data ?? []).map((row) => {
    const patient = firstEmbedded(
      row.patients as
        | { first_name: string; last_name: string; subject_code: string | null }
        | { first_name: string; last_name: string; subject_code: string | null }[]
        | null
    );
    const protocol = firstEmbedded(
      row.protocols as
        | { code_name: string; title: string }
        | { code_name: string; title: string }[]
        | null
    );
    return {
      id: row.id as string,
      patient_id: row.patient_id as string,
      protocol_id: row.protocol_id as string,
      randomized_at: row.updated_at as string,
      delivered_on: (row.medication_delivered_on as string | null) ?? null,
      patient_name: patient
        ? `${patient.last_name}, ${patient.first_name}`
        : "Paciente",
      subject_code: patient?.subject_code ?? null,
      protocol_code: protocol?.code_name ?? "",
      protocol_title: protocol?.title ?? "",
    };
  });

  return NextResponse.json({ rows });
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

  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Indica el paciente y la fecha de entrega." },
      { status: 400 }
    );
  }
  if (
    parsed.data.delivered_on &&
    !isPlausibleDeliveryDate(parsed.data.delivered_on)
  ) {
    return NextResponse.json(
      { error: "La fecha de entrega no es válida." },
      { status: 400 }
    );
  }

  const { data: screening, error: screeningError } = await gate.supabase
    .from("screenings")
    .select("id, status, patients!inner(clinic_id)")
    .eq("patient_id", parsed.data.patient_id)
    .eq("protocol_id", parsed.data.protocol_id)
    .eq("patients.clinic_id", gate.organizationId)
    .maybeSingle();

  if (screeningError) return opsSchemaErrorResponse(screeningError);
  if (!screening) {
    return NextResponse.json(
      { error: "Paciente o protocolo fuera de tu centro." },
      { status: 404 }
    );
  }
  if (screening.status !== "randomized") {
    return NextResponse.json(
      { error: "La fecha de entrega solo se anota en pacientes randomizados." },
      { status: 409 }
    );
  }

  const { data: saved, error: saveError } = await gate.supabase
    .from("screenings")
    .update({ medication_delivered_on: parsed.data.delivered_on })
    .eq("id", screening.id)
    .select("id, medication_delivered_on, status")
    .maybeSingle();

  if (saveError) {
    if (deliveryColumnMissing(saveError)) {
      return NextResponse.json({ error: DELIVERY_MIGRATION_HINT }, { status: 500 });
    }
    return opsSchemaErrorResponse(saveError);
  }
  if (!saved || (parsed.data.delivered_on && !saved.medication_delivered_on)) {
    return NextResponse.json(
      { error: "Solo se registra la fecha si el paciente sigue en Randomizado." },
      { status: 409 }
    );
  }

  try {
    await recordCustomAuditEvent({
      tableName: "screenings",
      recordId: screening.id,
      description: parsed.data.delivered_on
        ? "Se registró la fecha de entrega del medicamento."
        : "Se quitó la fecha de entrega del medicamento.",
      metadata: {
        event_type: "medication_delivered_on",
        protocol_id: parsed.data.protocol_id,
        patient_id: parsed.data.patient_id,
        delivered_on: parsed.data.delivered_on,
      },
    });
  } catch {
    // La fecha quedó guardada; la bitácora no debe bloquear al coordinador.
  }

  return NextResponse.json({
    id: saved.id,
    delivered_on: saved.medication_delivered_on,
  });
}
