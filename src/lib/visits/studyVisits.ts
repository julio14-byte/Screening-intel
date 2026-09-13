import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUserOrganizationIds } from "@/lib/documents/clinicalDocuments";
import { VISIT_STATUSES, VISIT_TYPES } from "@/lib/visits/labels";
import type { StudyVisit, VisitType } from "@/lib/types";

const VISIT_COLUMNS =
  "id, clinic_id, patient_id, protocol_id, visit_type, scheduled_at, status, notes, created_by, created_at, updated_at, patients(id, first_name, last_name), protocols(id, title, code_name)";

export const visitCreateSchema = z.object({
  patientId: z.string().uuid(),
  protocolId: z.string().uuid().nullable().optional(),
  visitType: z.enum(VISIT_TYPES),
  scheduledAt: z.string().min(1),
  notes: z.string().max(2000).optional().nullable(),
});

export const visitPatchSchema = z.object({
  visitType: z.enum(VISIT_TYPES).optional(),
  scheduledAt: z.string().min(1).optional(),
  status: z.enum(VISIT_STATUSES).optional(),
  notes: z.string().max(2000).optional().nullable(),
  protocolId: z.string().uuid().nullable().optional(),
});

export async function listStudyVisits(input: {
  from?: string;
  to?: string;
  patientId?: string;
}): Promise<StudyVisit[]> {
  const supabase = await createClient();
  let query = supabase
    .from("study_visits")
    .select(VISIT_COLUMNS)
    .order("scheduled_at", { ascending: true });

  if (input.from) query = query.gte("scheduled_at", input.from);
  if (input.to) query = query.lte("scheduled_at", input.to);
  if (input.patientId) query = query.eq("patient_id", input.patientId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as StudyVisit[];
}

export async function createStudyVisit(input: {
  userId: string;
  patientId: string;
  protocolId?: string | null;
  visitType: VisitType;
  scheduledAt: string;
  notes?: string | null;
}): Promise<StudyVisit> {
  const supabase = await createClient();
  const orgIds = await getUserOrganizationIds(input.userId);
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id, clinic_id")
    .eq("id", input.patientId)
    .maybeSingle();
  if (patientError) throw new Error(patientError.message);
  if (!patient || !orgIds.includes(patient.clinic_id as string)) {
    throw new Error("Paciente no encontrado.");
  }

  const scheduled = new Date(input.scheduledAt);
  if (Number.isNaN(scheduled.getTime())) {
    throw new Error("Fecha de visita inválida.");
  }

  const { data, error } = await supabase
    .from("study_visits")
    .insert({
      clinic_id: patient.clinic_id,
      patient_id: patient.id,
      protocol_id: input.protocolId || null,
      visit_type: input.visitType,
      scheduled_at: scheduled.toISOString(),
      notes: input.notes?.trim() || null,
      created_by: input.userId,
    })
    .select(VISIT_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as StudyVisit;
}

export async function updateStudyVisit(
  id: string,
  patch: z.infer<typeof visitPatchSchema>
): Promise<StudyVisit> {
  const supabase = await createClient();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.visitType) payload.visit_type = patch.visitType;
  if (patch.status) payload.status = patch.status;
  if (patch.notes !== undefined) payload.notes = patch.notes?.trim() || null;
  if (patch.protocolId !== undefined) payload.protocol_id = patch.protocolId;
  if (patch.scheduledAt) {
    const scheduled = new Date(patch.scheduledAt);
    if (Number.isNaN(scheduled.getTime())) {
      throw new Error("Fecha de visita inválida.");
    }
    payload.scheduled_at = scheduled.toISOString();
  }

  const { data, error } = await supabase
    .from("study_visits")
    .update(payload)
    .eq("id", id)
    .select(VISIT_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Visita no encontrada.");
  return data as unknown as StudyVisit;
}

export async function deleteStudyVisit(id: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_visits")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Visita no encontrada.");
}
