import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  assertPatientInOrg,
  getUserOrganizationIds,
  storeClinicalDocument,
} from "@/lib/documents/clinicalDocuments";
import type { InformedConsent } from "@/lib/types";

const CONSENT_COLUMNS =
  "id, clinic_id, patient_id, protocol_id, icf_version, consented_at, captured_by, document_id, status, notes, created_at, updated_at, protocols(id, title, code_name)";

export const consentCreateSchema = z.object({
  protocolId: z.string().uuid(),
  icfVersion: z.string().trim().min(1).max(80),
  consentedAt: z.string().min(1),
  notes: z.string().max(2000).optional().nullable(),
});

export async function listInformedConsents(
  patientId: string
): Promise<InformedConsent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("informed_consents")
    .select(CONSENT_COLUMNS)
    .eq("patient_id", patientId)
    .order("consented_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as InformedConsent[];
}

export async function createInformedConsent(input: {
  userId: string;
  patientId: string;
  protocolId: string;
  icfVersion: string;
  consentedAt: string;
  notes?: string | null;
  file?: File | null;
}): Promise<InformedConsent> {
  const supabase = await createClient();
  const orgIds = await getUserOrganizationIds(input.userId);
  const patient = await assertPatientInOrg(input.patientId, orgIds);

  const consented = new Date(`${input.consentedAt}T00:00:00`);
  if (Number.isNaN(consented.getTime())) {
    throw new Error("Fecha de consentimiento inválida.");
  }

  let documentId: string | null = null;
  if (input.file && input.file.size > 0) {
    const document = await storeClinicalDocument({
      patientId: patient.id,
      clinicId: patient.clinic_id,
      uploadedBy: input.userId,
      file: input.file,
      kind: "informed_consent",
    });
    documentId = document.id;
  }

  const { data, error } = await supabase
    .from("informed_consents")
    .insert({
      clinic_id: patient.clinic_id,
      patient_id: patient.id,
      protocol_id: input.protocolId,
      icf_version: input.icfVersion.trim(),
      consented_at: input.consentedAt,
      captured_by: input.userId,
      document_id: documentId,
      notes: input.notes?.trim() || null,
      status: "obtained",
    })
    .select(CONSENT_COLUMNS)
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "Ya existe un consentimiento con esa versión para este protocolo."
      );
    }
    throw new Error(error.message);
  }
  return data as unknown as InformedConsent;
}

export async function withdrawInformedConsent(
  patientId: string,
  consentId: string
): Promise<InformedConsent> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("informed_consents")
    .update({
      status: "withdrawn",
      updated_at: new Date().toISOString(),
    })
    .eq("id", consentId)
    .eq("patient_id", patientId)
    .select(CONSENT_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Consentimiento no encontrado.");
  return data as unknown as InformedConsent;
}
