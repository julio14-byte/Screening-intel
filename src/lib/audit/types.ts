/** Acciones registradas en la bitácora de auditoría. */
export type AuditAction = "INSERT" | "UPDATE" | "DELETE" | "CUSTOM";

/** Fila de `public.audit_logs`. */
export interface AuditLog {
  id: string;
  user_id: string | null;
  action: AuditAction;
  table_name: string;
  record_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

/** Payload de eventos CUSTOM en `new_data`. */
export interface CustomAuditPayload {
  description: string;
  metadata?: Record<string, unknown>;
  recorded_at?: string;
}

/** Parámetros para registrar un evento manual desde el servidor. */
export interface RecordCustomAuditInput {
  tableName: string;
  recordId: string;
  description: string;
  metadata?: Record<string, unknown>;
  /** Override explícito cuando se usa service role sin JWT de usuario. */
  userId?: string | null;
}

/** Cambio de campo para diff visual en la UI. */
export interface AuditFieldChange {
  field: string;
  before: unknown;
  after: unknown;
}
