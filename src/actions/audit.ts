"use server";

import {
  fetchAuditLogs,
  recordCustomAuditEvent,
  recordInclusionApproval,
  recordScreeningStatusAudit,
} from "@/lib/audit/record-audit-event";
import type { AuditLog, RecordCustomAuditInput } from "@/lib/audit/types";
import { requirePermission } from "@/lib/rbac/require-permission";
import {
  customAuditEventSchema,
  inclusionApprovalSchema,
  safeParseBody,
} from "@/lib/security/schemas";
import { z } from "zod";

const screeningStatusAuditSchema = z.object({
  patientId: z.string().uuid(),
  screeningId: z.string().uuid(),
  previousStatus: z.string().trim().min(1).max(64),
  newStatus: z.string().trim().min(1).max(64),
  userId: z.string().uuid().nullish(),
});

const auditLogsQuerySchema = z.object({
  tableName: z.enum(["patients", "clinical_profiles", "screenings", "protocols"]),
  recordId: z.string().uuid(),
  limit: z.number().int().min(1).max(500).optional(),
});

export async function logCustomAuditEventAction(
  input: RecordCustomAuditInput
): Promise<{ ok: true; auditId: string } | { ok: false; error: string }> {
  try {
    await requirePermission("audit:write");

    const parsed = safeParseBody(customAuditEventSchema, input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error };
    }

    const auditId = await recordCustomAuditEvent(parsed.data);
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
    const { user } = await requirePermission("screenings:approve");

    const parsed = safeParseBody(inclusionApprovalSchema, input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error };
    }

    const auditId = await recordInclusionApproval({
      patientId: parsed.data.patientId,
      protocolId: parsed.data.protocolId,
      criterion: parsed.data.criterion,
      approvedByUserId: parsed.data.approvedByUserId ?? user.id,
      notes: parsed.data.notes,
    });
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
    await requirePermission("audit:write");

    const parsed = safeParseBody(screeningStatusAuditSchema, input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error };
    }

    const auditId = await recordScreeningStatusAudit(parsed.data);
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
    const parsed = safeParseBody(auditLogsQuerySchema, input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error };
    }

    const logs = await fetchAuditLogs({
      tableName: parsed.data.tableName,
      recordId: parsed.data.recordId,
      limit: parsed.data.limit,
    });
    return { ok: true, logs };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al cargar auditoría",
    };
  }
}
