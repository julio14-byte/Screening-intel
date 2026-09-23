import { NextResponse } from "next/server";
import { opsContext } from "@/lib/ops/http";

export async function GET() {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const [lotsRes, movementsRes, prescriptionsRes] = await Promise.all([
    gate.supabase
      .from("medication_lots")
      .select(
        "id, organization_id, protocol_id, study_medication_id, lot_number, expires_on, quantity_received, quantity_on_hand, received_at, notes, created_at, protocol_study_medications(name, strength, form, unit), protocols(code_name, title)"
      )
      .eq("organization_id", gate.organizationId)
      .order("received_at", { ascending: false })
      .limit(120),
    gate.supabase
      .from("inventory_movements")
      .select(
        "id, lot_id, prescription_id, kind, quantity_delta, quantity_after, note, created_at"
      )
      .eq("organization_id", gate.organizationId)
      .order("created_at", { ascending: false })
      .limit(40),
    gate.supabase
      .from("prescriptions")
      .select(
        "id, patient_id, protocol_id, study_medication_id, lot_id, quantity, directions, status, delivered_at, created_at, patients(first_name, last_name), protocol_study_medications(name, unit), medication_lots(lot_number), protocols(code_name)"
      )
      .eq("organization_id", gate.organizationId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const firstError =
    lotsRes.error || movementsRes.error || prescriptionsRes.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  return NextResponse.json({
    lots: lotsRes.data ?? [],
    movements: movementsRes.data ?? [],
    prescriptions: prescriptionsRes.data ?? [],
  });
}
