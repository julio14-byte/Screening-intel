import { computeAuditDiff, formatValue } from "./diff";
import type {
  AuditAction,
  AuditLog,
  CustomAuditPayload,
} from "./types";

const ACTION_LABELS: Record<AuditAction, string> = {
  INSERT: "Alta de registro",
  UPDATE: "Modificación",
  DELETE: "Eliminación",
  CUSTOM: "Evento de auditoría",
};

const TABLE_LABELS: Record<string, string> = {
  patients: "Paciente",
  clinical_profiles: "Perfil clínico",
  screenings: "Screening",
  protocols: "Protocolo",
};

export interface FormattedAuditEntry {
  id: string;
  action: AuditAction;
  actionLabel: string;
  tableLabel: string;
  tableName: string;
  recordId: string;
  userId: string | null;
  createdAt: string;
  summary: string;
  fieldChanges: ReturnType<typeof computeAuditDiff>;
  customPayload: CustomAuditPayload | null;
  rawOldData: Record<string, unknown> | null;
  rawNewData: Record<string, unknown> | null;
}

function isCustomPayload(data: Record<string, unknown> | null): CustomAuditPayload | null {
  if (!data || typeof data.description !== "string") return null;
  return {
    description: data.description,
    metadata:
      data.metadata && typeof data.metadata === "object"
        ? (data.metadata as Record<string, unknown>)
        : undefined,
    recorded_at:
      typeof data.recorded_at === "string" ? data.recorded_at : undefined,
  };
}

export function formatAuditEntry(log: AuditLog): FormattedAuditEntry {
  const tableLabel = TABLE_LABELS[log.table_name] ?? log.table_name;
  const actionLabel = ACTION_LABELS[log.action];
  const customPayload =
    log.action === "CUSTOM" ? isCustomPayload(log.new_data) : null;

  let summary: string;

  if (customPayload) {
    summary = customPayload.description;
  } else if (log.action === "DELETE") {
    summary = `Se eliminó un registro de ${tableLabel}.`;
  } else if (log.action === "UPDATE") {
    const changes = computeAuditDiff(log.old_data, log.new_data);
    if (changes.length === 0) {
      summary = `Actualización en ${tableLabel} sin cambios detectados en campos.`;
    } else if (changes.length === 1) {
      summary = `Campo "${changes[0].field}" actualizado en ${tableLabel}.`;
    } else {
      summary = `${changes.length} campos actualizados en ${tableLabel}.`;
    }
  } else {
    summary = `Nuevo registro en ${tableLabel}.`;
  }

  return {
    id: log.id,
    action: log.action,
    actionLabel,
    tableLabel,
    tableName: log.table_name,
    recordId: log.record_id,
    userId: log.user_id,
    createdAt: log.created_at,
    summary,
    fieldChanges: computeAuditDiff(log.old_data, log.new_data),
    customPayload,
    rawOldData: log.old_data,
    rawNewData: log.new_data,
  };
}

export function formatAuditTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatAuditUser(userId: string | null): string {
  if (!userId) return "Sistema / usuario no identificado";
  return `Usuario ${userId.slice(0, 8)}…`;
}

export { formatValue };
