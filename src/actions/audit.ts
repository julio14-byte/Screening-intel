"use server";

import {
  fetchAuditLogs,
  recordCustomAuditEvent,
  recordInclusionApproval,
  recordScreeningStatusAudit,
} from "@/lib/audit/record-audit-event";
import type { AuditLog, RecordCustomAuditInput } from "@/lib/audit/types";

export async function logCustomAuditEventAction(
  input: RecordCustomAuditInput
): Promise<{ ok: true; auditId: string } | { ok: false; error: string }> {
  try {
    const auditId = await recordCustomAuditEvent(input);
    return { ok: true, auditId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al registrar auditoría",
    };
  }
}

export async function logInclusionApprovalAction(input: {
  patientId: string;
  protocolId: string;
  criterion: string;
  approvedByUserId?: string | null;
  notes?: string;
}): Promise<{ ok: true; auditId: string } | { ok: false; error: string }> {
  try {
    const auditId = await recordInclusionApproval(input);
    return { ok: true, auditId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al registrar aprobación",
    };
  }
}

export async function logScreeningStatusAction(input: {
  patientId: string;
  screeningId: string;
  previousStatus: string;
  newStatus: string;
  userId?: string | null;
}): Promise<{ ok: true; auditId: string } | { ok: false; error: string }> {
  try {
    const auditId = await recordScreeningStatusAudit(input);
    return { ok: true, auditId };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "Error al registrar cambio de estatus",
    };
  }
}

export async function getAuditLogsAction(input: {
  tableName: string;
  recordId: string;
  limit?: number;
}): Promise<{ ok: true; logs: AuditLog[] } | { ok: false; error: string }> {
  try {
    const logs = await fetchAuditLogs(input);
    return { ok: true, logs };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al cargar auditoría",
    };
  }
}
