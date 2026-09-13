import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ClinicalDocument, ClinicalDocumentKind } from "@/lib/types";
import {
  decryptDocumentBytes,
  encryptDocumentBytes,
  getDocumentEncryptionKey,
  sha256Hex,
  type DocumentEncryption,
} from "@/lib/documents/encrypt";

export const CLINICAL_DOCUMENTS_BUCKET = "clinical-documents";
export const PDF_MAX_BYTES = 8 * 1024 * 1024;
export const IMAGE_MAX_BYTES = 4 * 1024 * 1024;

export type ClinicalDocumentRow = ClinicalDocument;

const LIST_COLUMNS =
  "id, clinic_id, patient_id, kind, original_filename, content_type, byte_size, sha256, encryption, uploaded_by, created_at";

export async function getUserOrganizationIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.organization_id as string);
}

export function mimeOf(file: File): string {
  const type = file.type.toLowerCase();
  if (type) return type === "image/jpg" ? "image/jpeg" : type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return type;
}

export function kindFromMime(mime: string): ClinicalDocumentKind {
  if (mime === "application/pdf") return "lab_pdf";
  if (mime === "image/jpeg" || mime === "image/png" || mime === "image/webp") {
    return "prescription_photo";
  }
  return "other";
}

export function sanitizeFilename(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "documento";
  return base.replace(/[^\w.\- ()áéíóúÁÉÍÓÚñÑ]/g, "_").slice(0, 180) || "documento";
}

export async function assertPatientInOrg(
  patientId: string,
  organizationIds: string[]
): Promise<{ id: string; clinic_id: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .select("id, clinic_id")
    .eq("id", patientId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Paciente no encontrado.");
  if (!organizationIds.includes(data.clinic_id as string)) {
    throw new Error("Paciente fuera de tu centro.");
  }
  return data as { id: string; clinic_id: string };
}

export async function listClinicalDocuments(
  patientId: string
): Promise<ClinicalDocumentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clinical_documents")
    .select(LIST_COLUMNS)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ClinicalDocumentRow[];
}

export async function storeClinicalDocument(input: {
  patientId: string;
  clinicId: string;
  uploadedBy: string;
  file: File;
  kind?: ClinicalDocumentKind;
}): Promise<ClinicalDocumentRow> {
  const mime = mimeOf(input.file);
  const kind = input.kind ?? kindFromMime(mime);
  const allowed: ClinicalDocumentKind[] = [
    "lab_pdf",
    "prescription_photo",
    "informed_consent",
  ];
  if (!allowed.includes(kind)) {
    throw new Error("Usa PDF, JPEG, PNG o WebP. HEIC no está soportado.");
  }
  if (input.file.size === 0) {
    throw new Error("El archivo está vacío.");
  }
  const max = mime === "application/pdf" ? PDF_MAX_BYTES : IMAGE_MAX_BYTES;
  if (input.file.size > max) {
    throw new Error(
      mime === "application/pdf" ? "El PDF supera 8 MB." : "La imagen supera 4 MB."
    );
  }

  const plain = new Uint8Array(await input.file.arrayBuffer());
  const key = getDocumentEncryptionKey();
  const encryption: DocumentEncryption = key ? "aes-256-gcm" : "storage_at_rest";
  const payload = key ? encryptDocumentBytes(plain, key) : Buffer.from(plain);
  const id = crypto.randomUUID();
  const storagePath = `${input.clinicId}/${input.patientId}/${id}.bin`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(CLINICAL_DOCUMENTS_BUCKET)
    .upload(storagePath, payload, {
      contentType: "application/octet-stream",
      upsert: false,
    });
  if (uploadError) {
    throw new Error(`No se pudo guardar el archivo: ${uploadError.message}`);
  }

  const row = {
    id,
    clinic_id: input.clinicId,
    patient_id: input.patientId,
    kind,
    original_filename: sanitizeFilename(input.file.name),
    content_type: mime,
    byte_size: plain.byteLength,
    sha256: sha256Hex(plain),
    storage_path: storagePath,
    encryption,
    uploaded_by: input.uploadedBy,
  };

  const { data, error } = await admin
    .from("clinical_documents")
    .insert(row)
    .select(LIST_COLUMNS)
    .single();

  if (error) {
    await admin.storage.from(CLINICAL_DOCUMENTS_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }

  return data as ClinicalDocumentRow;
}

export async function downloadClinicalDocument(input: {
  documentId: string;
  patientId: string;
  organizationIds: string[];
}): Promise<{ bytes: Buffer; row: ClinicalDocumentRow & { storage_path: string } }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clinical_documents")
    .select(`${LIST_COLUMNS}, storage_path`)
    .eq("id", input.documentId)
    .eq("patient_id", input.patientId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Documento no encontrado.");
  if (!input.organizationIds.includes(data.clinic_id as string)) {
    throw new Error("Documento fuera de tu centro.");
  }

  const { data: blob, error: downloadError } = await admin.storage
    .from(CLINICAL_DOCUMENTS_BUCKET)
    .download(data.storage_path as string);
  if (downloadError || !blob) {
    throw new Error(downloadError?.message ?? "No se pudo leer el archivo.");
  }

  const packed = new Uint8Array(await blob.arrayBuffer());
  const encryption = data.encryption as DocumentEncryption;
  let bytes: Buffer;
  if (encryption === "aes-256-gcm") {
    const key = getDocumentEncryptionKey();
    if (!key) throw new Error("DOCUMENT_ENCRYPTION_KEY no configurada para descifrar.");
    bytes = decryptDocumentBytes(packed, key);
  } else {
    bytes = Buffer.from(packed);
  }

  return {
    bytes,
    row: data as ClinicalDocumentRow & { storage_path: string },
  };
}

export async function deleteClinicalDocument(input: {
  documentId: string;
  patientId: string;
  organizationIds: string[];
  userId: string;
  isInvestigator: boolean;
}): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clinical_documents")
    .select("id, clinic_id, storage_path, uploaded_by")
    .eq("id", input.documentId)
    .eq("patient_id", input.patientId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Documento no encontrado.");
  if (!input.organizationIds.includes(data.clinic_id as string)) {
    throw new Error("Documento fuera de tu centro.");
  }
  if (!input.isInvestigator && data.uploaded_by !== input.userId) {
    throw new Error("Solo el PI o quien subió el archivo puede borrarlo.");
  }

  const { error: deleteError } = await admin
    .from("clinical_documents")
    .delete()
    .eq("id", input.documentId);
  if (deleteError) throw new Error(deleteError.message);

  await admin.storage
    .from(CLINICAL_DOCUMENTS_BUCKET)
    .remove([data.storage_path as string]);
}
