import {
  createClient,
  getUser,
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
 * El actor siempre es el usuario de la sesión: `input.userId` se ignora para que
 * nadie pueda atribuir eventos a otra persona. La RPC verifica además que el
 * registro pertenezca a la organización del usuario.
 */
export async function recordCustomAuditEvent(
  input: RecordCustomAuditInput
): Promise<string> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) {
    throw new AuditRecordError("Se requiere sesión para registrar auditoría.");
  }

  const { data, error } = await supabase.rpc("record_custom_audit_event", {
    p_table_name: input.tableName,
    p_record_id: input.recordId,
    p_description: input.description,
    p_metadata: input.metadata ?? {},
    p_user_id: user.id,
  });

  if (error || !data) {
    throw new AuditRecordError(
      "No se pudo registrar el evento de auditoría.",
      error
    );
  }

  return data as string;
}

/** Consulta entradas de auditoría para un registro concreto. */
export async function fetchAuditLogs(params: {
  tableName: string;
  recordId: string;
  limit?: number;
}): Promise<AuditLog[]> {
  const limit = Math.min(Math.max(Math.trunc(params.limit ?? 100) || 100, 1), 200);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("table_name", params.tableName)
    .eq("record_id", params.recordId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new AuditRecordError("No se pudieron cargar los registros de auditoría.", error);
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
