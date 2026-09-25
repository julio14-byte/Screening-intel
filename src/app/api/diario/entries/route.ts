import { NextResponse } from "next/server";
import { opsContext, opsSchemaErrorResponse } from "@/lib/ops/http";
import { isMissingDispenseSchema } from "@/lib/pharmacy/dispense";

export async function GET(request: Request) {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const patientId = new URL(request.url).searchParams.get("patient_id");
  let query = gate.supabase
    .from("dosing_diary_entries")
    .select(
      "id, patient_id, protocol_id, diary_on, taken_at, taken, symptoms, severity, source, created_at, protocols(code_name)"
    )
    .eq("organization_id", gate.organizationId)
    .order("diary_on", { ascending: false })
    .limit(60);

  if (patientId) query = query.eq("patient_id", patientId);

  const { data, error } = await query;
  if (error) {
    if (isMissingDispenseSchema(error.message)) {
      return NextResponse.json({ entries: [] });
    }
    return opsSchemaErrorResponse(error);
  }

  return NextResponse.json({ entries: data ?? [] });
}
