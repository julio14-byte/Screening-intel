import { NextResponse } from "next/server";
import { z } from "zod";
import { opsContext } from "@/lib/ops/http";
import {
  VISIT_KINDS,
  VISIT_NOTES_MAX,
  VISIT_STATUSES,
} from "@/lib/ops/model";

const createSchema = z.object({
  patient_id: z.string().uuid(),
  protocol_id: z.string().uuid().nullable().optional(),
  scheduled_at: z.string().datetime(),
  location: z.string().trim().max(120).optional(),
  clinician_name: z.string().trim().max(120).optional(),
  kind: z.enum(VISIT_KINDS).optional(),
  notes: z.string().trim().max(VISIT_NOTES_MAX).optional(),
});

const patchSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(VISIT_STATUSES).optional(),
    notes: z.string().max(VISIT_NOTES_MAX).optional(),
    clinician_name: z.string().trim().max(120).optional(),
    kind: z.enum(VISIT_KINDS).optional(),
    location: z.string().trim().max(120).optional(),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.notes !== undefined ||
      value.clinician_name !== undefined ||
      value.kind !== undefined ||
      value.location !== undefined,
    { message: "Nada que actualizar." }
  );

const SELECT =
  "id, patient_id, protocol_id, scheduled_at, location, status, notes, kind, clinician_name, patients(first_name, last_name), protocols(code_name)";

export async function GET(request: Request) {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const patientId = new URL(request.url).searchParams.get("patient_id");

  let query = gate.supabase
    .from("study_visits")
    .select(SELECT)
    .eq("organization_id", gate.organizationId)
    .order("scheduled_at", { ascending: false })
    .limit(120);

  if (patientId) {
    const parsed = z.string().uuid().safeParse(patientId);
    if (!parsed.success) {
      return NextResponse.json({ error: "Paciente inválido." }, { status: 400 });
    }
    query = query.eq("patient_id", parsed.data);
  }

  const { data, error } = await query;

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

  if (parsed.data.protocol_id) {
    const { data: protocol, error: protocolError } = await gate.supabase
      .from("protocols")
      .select("id")
      .eq("id", parsed.data.protocol_id)
      .eq("clinic_id", gate.organizationId)
      .maybeSingle();
    if (protocolError) {
      return NextResponse.json({ error: protocolError.message }, { status: 500 });
    }
    if (!protocol) {
      return NextResponse.json({ error: "Protocolo fuera de tu centro." }, { status: 404 });
    }
  }

  const { data, error } = await gate.supabase
    .from("study_visits")
    .insert({
      organization_id: gate.organizationId,
      patient_id: parsed.data.patient_id,
      protocol_id: parsed.data.protocol_id ?? null,
      scheduled_at: parsed.data.scheduled_at,
      location: parsed.data.location ?? "",
      clinician_name: parsed.data.clinician_name ?? "",
      kind: parsed.data.kind ?? "consulta",
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
    return NextResponse.json({ error: "Datos de visita inválidos." }, { status: 400 });
  }

  const patch: Record<string, string> = {};
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes.trim();
  if (parsed.data.clinician_name !== undefined) {
    patch.clinician_name = parsed.data.clinician_name;
  }
  if (parsed.data.kind !== undefined) patch.kind = parsed.data.kind;
  if (parsed.data.location !== undefined) patch.location = parsed.data.location;

  const { data, error } = await gate.supabase
    .from("study_visits")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("organization_id", gate.organizationId)
    .select("id, status, notes, clinician_name, kind, location")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Visita no encontrada." }, { status: 404 });
  }

  return NextResponse.json({ visit: data });
}
