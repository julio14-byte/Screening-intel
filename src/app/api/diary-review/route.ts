import { NextResponse } from "next/server";
import { opsContext } from "@/lib/ops/http";
import {
  DIARY_COLUMNS,
  DIARY_MIGRATION_HINT,
  diaryInputSchema,
} from "@/lib/diary/review";

const UUID = /^[0-9a-f-]{36}$/i;

function failure(error: { code?: string; message?: string }, fallback: string) {
  console.error("[diary-review]", error.code ?? "", error.message);
  const missing =
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /schema cache|does not exist/i.test(error.message ?? "");
  return NextResponse.json(
    { error: missing ? DIARY_MIGRATION_HINT : fallback },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const patientId = new URL(request.url).searchParams.get("patient_id") ?? "";
  if (!UUID.test(patientId)) {
    return NextResponse.json({ error: "Paciente inválido." }, { status: 400 });
  }

  const { data, error } = await gate.supabase
    .from("diary_reviews")
    .select(DIARY_COLUMNS)
    .eq("organization_id", gate.organizationId)
    .eq("patient_id", patientId)
    .order("reviewed_at", { ascending: false })
    .limit(200);

  if (error) return failure(error, "No se pudieron cargar las revisiones del diario.");
  return NextResponse.json({ reviews: data ?? [] });
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

  const parsed = diaryInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }
  const v = parsed.data;

  if (v.visit_id) {
    const { data: visit, error: visitError } = await gate.supabase
      .from("follow_up_visits")
      .select("id")
      .eq("id", v.visit_id)
      .eq("organization_id", gate.organizationId)
      .eq("patient_id", v.patient_id)
      .eq("protocol_id", v.protocol_id)
      .maybeSingle();
    if (visitError) return failure(visitError, "No se pudo validar la visita.");
    if (!visit) {
      return NextResponse.json(
        { error: "La visita no corresponde a este paciente y protocolo." },
        { status: 400 }
      );
    }
  }

  const { data, error } = await gate.supabase
    .from("diary_reviews")
    .insert({
      organization_id: gate.organizationId,
      patient_id: v.patient_id,
      protocol_id: v.protocol_id,
      visit_id: v.visit_id ?? null,
      source_system: v.source_system,
      source_ref: v.source_ref,
      period_start: v.period_start,
      period_end: v.period_end,
      expected_days: v.expected_days,
      completed_days: v.completed_days,
      missed_doses: v.missed_doses,
      possible_ae: v.possible_ae,
      ae_note: v.possible_ae ? v.ae_note || null : null,
      new_medications: v.new_medications,
      new_medications_note: v.new_medications ? v.new_medications_note || null : null,
      note: v.note || null,
    })
    .select(DIARY_COLUMNS)
    .single();

  if (error) return failure(error, "No se pudo registrar la revisión del diario.");
  return NextResponse.json({ review: data }, { status: 201 });
}
