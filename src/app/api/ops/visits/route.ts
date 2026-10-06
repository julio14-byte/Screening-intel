import { NextResponse } from "next/server";
import { z } from "zod";
import { opsContext, opsSchemaErrorResponse } from "@/lib/ops/http";
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
  force: z.boolean().optional(),
});

const CONFLICT_WINDOW_MS = 60 * 60 * 1000;

const patchSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(VISIT_STATUSES).optional(),
    scheduled_at: z.string().datetime().optional(),
    notes: z.string().max(VISIT_NOTES_MAX).optional(),
    clinician_name: z.string().trim().max(120).optional(),
    kind: z.enum(VISIT_KINDS).optional(),
    location: z.string().trim().max(120).optional(),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.scheduled_at !== undefined ||
      value.notes !== undefined ||
      value.clinician_name !== undefined ||
      value.kind !== undefined ||
      value.location !== undefined,
    { message: "Nada que actualizar." }
  );

const SELECT =
  "id, patient_id, protocol_id, scheduled_at, location, status, notes, kind, clinician_name, patients(first_name, last_name, subject_code, phone, email), protocols(code_name)";

const dateParam = z.string().datetime().optional();

export async function GET(request: Request) {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const params = new URL(request.url).searchParams;
  const patientId = params.get("patient_id");
  const from = dateParam.safeParse(params.get("from") ?? undefined);
  const to = dateParam.safeParse(params.get("to") ?? undefined);
  if (!from.success || !to.success) {
    return NextResponse.json({ error: "Rango de fechas inválido." }, { status: 400 });
  }

  const now = Date.now();
  const fromIso = from.data ?? new Date(now - 60 * 86_400_000).toISOString();
  const toIso = to.data ?? new Date(now + 180 * 86_400_000).toISOString();

  let query = gate.supabase
    .from("study_visits")
    .select(SELECT)
    .eq("organization_id", gate.organizationId)
    .gte("scheduled_at", fromIso)
    .lte("scheduled_at", toIso)
    .order("scheduled_at", { ascending: true })
    .limit(500);

  if (patientId) {
    const parsed = z.string().uuid().safeParse(patientId);
    if (!parsed.success) {
      return NextResponse.json({ error: "Paciente inválido." }, { status: 400 });
    }
    query = query.eq("patient_id", parsed.data);
  }

  const { data, error } = await query;

  if (error) {
    return opsSchemaErrorResponse(error);
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
    return NextResponse.json({ error: "No se pudo validar el paciente." }, { status: 500 });
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
      return NextResponse.json({ error: "No se pudo validar el protocolo." }, { status: 500 });
    }
    if (!protocol) {
      return NextResponse.json({ error: "Protocolo fuera de tu centro." }, { status: 404 });
    }
  }

  if (!parsed.data.force) {
    const at = new Date(parsed.data.scheduled_at).getTime();
    const { data: nearby, error: nearbyError } = await gate.supabase
      .from("study_visits")
      .select("id, scheduled_at")
      .eq("organization_id", gate.organizationId)
      .eq("patient_id", parsed.data.patient_id)
      .eq("status", "scheduled")
      .gte("scheduled_at", new Date(at - CONFLICT_WINDOW_MS).toISOString())
      .lte("scheduled_at", new Date(at + CONFLICT_WINDOW_MS).toISOString())
      .limit(1);
    if (nearbyError) {
      return opsSchemaErrorResponse(nearbyError);
    }
    if (nearby && nearby.length > 0) {
      return NextResponse.json(
        {
          error: "Este paciente ya tiene una cita programada en ese horario.",
          conflict: true,
        },
        { status: 409 }
      );
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
    return opsSchemaErrorResponse(error);
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
  if (parsed.data.scheduled_at !== undefined) {
    patch.scheduled_at = parsed.data.scheduled_at;
  }
  if (parsed.data.kind !== undefined) patch.kind = parsed.data.kind;
  if (parsed.data.location !== undefined) patch.location = parsed.data.location;

  const { data, error } = await gate.supabase
    .from("study_visits")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("organization_id", gate.organizationId)
    .select("id, status, scheduled_at, notes, clinician_name, kind, location")
    .maybeSingle();

  if (error) {
    return opsSchemaErrorResponse(error);
  }
  if (!data) {
    return NextResponse.json({ error: "Visita no encontrada." }, { status: 404 });
  }

  return NextResponse.json({ visit: data });
}
