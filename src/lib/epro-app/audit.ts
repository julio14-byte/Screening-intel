import { createSupabaseAdminClient, isAuditAdminConfigured } from "@/lib/supabase/server";
import type { RecordCustomAuditInput } from "@/lib/audit/types";

/** Bitácora del ePRO móvil: el sujeto no es auth.users; user_id queda null. */
export async function recordEproMobileAudit(
  input: RecordCustomAuditInput & { subjectCode: string }
): Promise<void> {
  if (!isAuditAdminConfigured()) return;
  const admin = createSupabaseAdminClient();
  await admin.rpc("record_custom_audit_event", {
    p_table_name: input.tableName,
    p_record_id: input.recordId,
    p_description: input.description,
    p_metadata: {
      ...(input.metadata ?? {}),
      actor: "epro_subject",
      subject_code: input.subjectCode,
      recorded_at_utc: new Date().toISOString(),
    },
    p_user_id: null,
  });
}
