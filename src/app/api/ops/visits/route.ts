import { NextResponse } from "next/server";
import { z } from "zod";
import { opsContext } from "@/lib/ops/http";
import { VISIT_STATUSES } from "@/lib/ops/model";

const createSchema = z.object({
  patient_id: z.string().uuid(),
  protocol_id: z.string().uuid().nullable().optional(),
  scheduled_at: z.string().datetime(),
  location: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(VISIT_STATUSES),
});

export async function GET() {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const { data, error } = await gate.supabase
    .from("study_visits")
    .select(
      "id, patient_id, protocol_id, scheduled_at, location, status, notes, patients(first_name, last_name), protocols(code_name)"
    )
    .eq("organization_id", gate.organizationId)
    .order("scheduled_at", { ascending: true })
    .limit(60);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ visits: data ?? [] });
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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de visita inválidos." }, { status: 400 });
  }

  const { data: patient, error: patientError } = await gate.supabase
    .from("patients")
    .select("id")
    .eq("id", parsed.data.patient_id)
    .eq("clinic_id", gate.organizationId)
    .maybeSingle();

  if (patientError) {
    return NextResponse.json({ error: patientError.message }, { status: 500 });
  }
  if (!patient) {
    return NextResponse.json({ error: "Paciente fuera de tu centro." }, { status: 404 });
  }

  const { data, error } = await gate.supabase
    .from("study_visits")
    .insert({
      organization_id: gate.organizationId,
      patient_id: parsed.data.patient_id,
      protocol_id: parsed.data.protocol_id ?? null,
      scheduled_at: parsed.data.scheduled_at,
      location: parsed.data.location ?? "",
      notes: parsed.data.notes ?? "",
      created_by: gate.ctx.user.id,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ visit: data });
}

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
    return NextResponse.json({ error: "Estado de visita inválido." }, { status: 400 });
  }

  const { data, error } = await gate.supabase
    .from("study_visits")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .eq("organization_id", gate.organizationId)
    .select("id, status")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Visita no encontrada." }, { status: 404 });
  }

  return NextResponse.json({ visit: data });
}
