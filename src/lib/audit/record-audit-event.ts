import {
  createSupabaseAdminClient,
  createClient,
  getUser,
  isAuditAdminConfigured,
} from "@/lib/supabase/server";
import type { AuditLog, RecordCustomAuditInput } from "./types";

export class AuditRecordError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AuditRecordError";
  }
}

/**
 * Registra un evento de auditoría manual vía RPC `record_custom_audit_event`.
 * Preferir esta función para aprobaciones, notas del investigador principal, etc.
 */
export async function recordCustomAuditEvent(
  input: RecordCustomAuditInput
): Promise<string> {
  const payload = {
    p_table_name: input.tableName,
    p_record_id: input.recordId,
    p_description: input.description,
    p_metadata: input.metadata ?? {},
    p_user_id: input.userId ?? null,
  };

  const supabase = await createClient();
  const user = await getUser();

  const { data, error } = await supabase.rpc("record_custom_audit_event", {
    ...payload,
    p_user_id: payload.p_user_id ?? user?.id ?? null,
  });

  if (!error && data) {
    return data as string;
  }

  // Fallback con service role si la RPC falla por permisos (entornos sin auth)
  if (isAuditAdminConfigured()) {
    const admin = createSupabaseAdminClient();
    const { data: adminData, error: adminError } = await admin.rpc(
      "record_custom_audit_event",
      payload
    );

    if (adminError) {
      throw new AuditRecordError(
        `No se pudo registrar el evento de auditoría: ${adminError.message}`,
        adminError
      );
    }

    return adminData as string;
  }

  throw new AuditRecordError(
    error?.message ?? "No se pudo registrar el evento de auditoría.",
    error
  );
}

/** Consulta entradas de auditoría para un registro concreto. */
export async function fetchAuditLogs(params: {
  tableName: string;
  recordId: string;
  limit?: number;
}): Promise<AuditLog[]> {
  const limit = params.limit ?? 100;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("table_name", params.tableName)
    .eq("record_id", params.recordId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new AuditRecordError(
      `No se pudieron cargar los registros de auditoría: ${error.message}`,
      error
    );
  }

  return (data ?? []) as AuditLog[];
}

/**
 * Helper para registrar aprobaciones de criterios de inclusión/exclusión.
 */
export async function recordInclusionApproval(input: {
  patientId: string;
  protocolId: string;
  criterion: string;
  approvedByUserId?: string | null;
  notes?: string;
}): Promise<string> {
  return recordCustomAuditEvent({
    tableName: "patients",
    recordId: input.patientId,
    description: `El investigador principal aprobó el criterio de inclusión: "${input.criterion}".`,
    userId: input.approvedByUserId,
    metadata: {
      event_type: "inclusion_approval",
      protocol_id: input.protocolId,
      criterion: input.criterion,
      notes: input.notes ?? null,
    },
  });
}

/**
 * Helper para cambios de estatus del semáforo / pipeline de screening.
 */
export async function recordScreeningStatusAudit(input: {
  patientId: string;
  screeningId: string;
  previousStatus: string;
  newStatus: string;
  userId?: string | null;
}): Promise<string> {
  return recordCustomAuditEvent({
    tableName: "patients",
    recordId: input.patientId,
    description: `Cambio de estatus de screening: ${input.previousStatus} → ${input.newStatus}.`,
    userId: input.userId,
    metadata: {
      event_type: "screening_status_change",
      screening_id: input.screeningId,
      previous_status: input.previousStatus,
      new_status: input.newStatus,
    },
  });
}
