import { NextResponse } from "next/server";
import { z } from "zod";
import { opsContext } from "@/lib/ops/http";
import { parseQuantity } from "@/lib/pharmacy/model";

const createSchema = z.object({
  patient_id: z.string().uuid(),
  protocol_id: z.string().uuid(),
  study_medication_id: z.string().uuid(),
  lot_id: z.string().uuid(),
  quantity: z.union([z.number(), z.string()]),
  directions: z.string().trim().max(400).optional(),
  deliver: z.boolean().optional(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["deliver", "cancel"]),
});

export async function GET(request: Request) {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const patientId = new URL(request.url).searchParams.get("patient_id");

  let query = gate.supabase
    .from("prescriptions")
    .select(
      "id, organization_id, protocol_id, patient_id, study_medication_id, lot_id, quantity, directions, status, prescribed_by, delivered_at, delivered_by, created_at, updated_at, protocol_study_medications(name, strength, unit), medication_lots(lot_number), protocols(code_name)"
    )
    .eq("organization_id", gate.organizationId)
    .order("created_at", { ascending: false })
    .limit(60);

  if (patientId) query = query.eq("patient_id", patientId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prescriptions: data ?? [] });
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
  const quantity = parsed.success ? parseQuantity(parsed.data.quantity) : null;
  if (!parsed.success || quantity === null) {
    return NextResponse.json({ error: "Datos de la receta inválidos." }, { status: 400 });
  }

  const [patientRes, protocolRes, medRes, lotRes] = await Promise.all([
    gate.supabase
      .from("patients")
      .select("id")
      .eq("id", parsed.data.patient_id)
      .eq("clinic_id", gate.organizationId)
      .maybeSingle(),
    gate.supabase
      .from("protocols")
      .select("id")
      .eq("id", parsed.data.protocol_id)
      .eq("clinic_id", gate.organizationId)
      .maybeSingle(),
    gate.supabase
      .from("protocol_study_medications")
      .select("id, protocol_id")
      .eq("id", parsed.data.study_medication_id)
      .eq("organization_id", gate.organizationId)
      .maybeSingle(),
    gate.supabase
      .from("medication_lots")
      .select("id, study_medication_id, protocol_id, quantity_on_hand")
      .eq("id", parsed.data.lot_id)
      .eq("organization_id", gate.organizationId)
      .maybeSingle(),
  ]);

  if (patientRes.error || protocolRes.error || medRes.error || lotRes.error) {
    return NextResponse.json(
      {
        error:
          patientRes.error?.message ??
          protocolRes.error?.message ??
          medRes.error?.message ??
          lotRes.error?.message,
      },
      { status: 500 }
    );
  }

  if (!patientRes.data || !protocolRes.data || !medRes.data || !lotRes.data) {
    return NextResponse.json({ error: "Paciente, protocolo o lote fuera de tu centro." }, { status: 404 });
  }

  if (
    medRes.data.protocol_id !== parsed.data.protocol_id ||
    lotRes.data.protocol_id !== parsed.data.protocol_id ||
    lotRes.data.study_medication_id !== parsed.data.study_medication_id
  ) {
    return NextResponse.json(
      { error: "El lote no corresponde a ese medicamento del protocolo." },
      { status: 400 }
    );
  }

  if (parsed.data.deliver && Number(lotRes.data.quantity_on_hand) < quantity) {
    return NextResponse.json(
      { error: "Stock insuficiente en el lote seleccionado." },
      { status: 409 }
    );
  }

  const { data: prescription, error } = await gate.supabase
    .from("prescriptions")
    .insert({
      organization_id: gate.organizationId,
      protocol_id: parsed.data.protocol_id,
      patient_id: parsed.data.patient_id,
      study_medication_id: parsed.data.study_medication_id,
      lot_id: parsed.data.lot_id,
      quantity,
      directions: parsed.data.directions ?? "",
      status: "draft",
      prescribed_by: gate.ctx.user.id,
    })
    .select(
      "id, organization_id, protocol_id, patient_id, study_medication_id, lot_id, quantity, directions, status, prescribed_by, delivered_at, delivered_by, created_at, updated_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!parsed.data.deliver) {
    return NextResponse.json({ prescription });
  }

  const { data: delivered, error: deliverError } = await gate.supabase.rpc(
    "deliver_study_prescription",
    { p_prescription_id: prescription.id }
  );

  if (deliverError) {
    return NextResponse.json({ error: deliverError.message }, { status: 409 });
  }

  return NextResponse.json({ prescription: delivered ?? prescription });
}

export async function PATCH(request: Request) {
  const gate = await opsContext(true);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Acción de receta inválida." }, { status: 400 });
  }

  if (parsed.data.action === "deliver") {
    const { data, error } = await gate.supabase.rpc("deliver_study_prescription", {
      p_prescription_id: parsed.data.id,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ prescription: data });
  }

  const { data, error } = await gate.supabase
    .from("prescriptions")
    .update({ status: "cancelled" })
    .eq("id", parsed.data.id)
    .eq("organization_id", gate.organizationId)
    .eq("status", "draft")
    .select("id, status")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Solo se puede cancelar una receta en borrador." },
      { status: 409 }
    );
  }

  return NextResponse.json({ prescription: data });
}
