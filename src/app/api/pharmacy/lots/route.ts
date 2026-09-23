import { NextResponse } from "next/server";
import { z } from "zod";
import { opsContext } from "@/lib/ops/http";
import { parseQuantity } from "@/lib/pharmacy/model";

const createSchema = z.object({
  study_medication_id: z.string().uuid(),
  lot_number: z.string().trim().min(1).max(80),
  expires_on: z.string().date().nullable().optional(),
  quantity_received: z.union([z.number(), z.string()]),
  notes: z.string().trim().max(400).optional(),
});

export async function GET(request: Request) {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const params = new URL(request.url).searchParams;
  const protocolId = params.get("protocol_id");
  const medicationId = params.get("study_medication_id");

  let query = gate.supabase
    .from("medication_lots")
    .select(
      "id, organization_id, protocol_id, study_medication_id, lot_number, expires_on, quantity_received, quantity_on_hand, received_at, notes, created_at"
    )
    .eq("organization_id", gate.organizationId)
    .order("received_at", { ascending: false });

  if (protocolId) query = query.eq("protocol_id", protocolId);
  if (medicationId) query = query.eq("study_medication_id", medicationId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lots: data ?? [] });
}

export async function POST(request: Request) {
  const gate = await opsContext(true);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  const quantity = parsed.success ? parseQuantity(parsed.data.quantity_received) : null;
  if (!parsed.success || quantity === null) {
    return NextResponse.json({ error: "Datos del lote inválidos." }, { status: 400 });
  }

  const { data: medication, error: medError } = await gate.supabase
    .from("protocol_study_medications")
    .select("id, protocol_id")
    .eq("id", parsed.data.study_medication_id)
    .eq("organization_id", gate.organizationId)
    .maybeSingle();

  if (medError) {
    return NextResponse.json({ error: medError.message }, { status: 500 });
  }
  if (!medication) {
    return NextResponse.json({ error: "Medicamento fuera de tu centro." }, { status: 404 });
  }

  const { data: lot, error } = await gate.supabase
    .from("medication_lots")
    .insert({
      organization_id: gate.organizationId,
      protocol_id: medication.protocol_id,
      study_medication_id: medication.id,
      lot_number: parsed.data.lot_number,
      expires_on: parsed.data.expires_on ?? null,
      quantity_received: quantity,
      quantity_on_hand: quantity,
      notes: parsed.data.notes ?? "",
    })
    .select(
      "id, organization_id, protocol_id, study_medication_id, lot_number, expires_on, quantity_received, quantity_on_hand, received_at, notes, created_at"
    )
    .single();

  if (error) {
    const message = error.message.includes("medication_lots_unique")
      ? "Ese número de lote ya está registrado para este medicamento."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { error: movementError } = await gate.supabase.from("inventory_movements").insert({
    organization_id: gate.organizationId,
    lot_id: lot.id,
    kind: "receive",
    quantity_delta: quantity,
    quantity_after: quantity,
    note: "Recepción de lote de la farmacéutica",
    created_by: gate.ctx.user.id,
  });

  if (movementError) {
    return NextResponse.json({ error: movementError.message }, { status: 500 });
  }

  return NextResponse.json({ lot });
}
