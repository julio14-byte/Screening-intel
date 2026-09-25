import { NextResponse } from "next/server";
import { z } from "zod";
import { firstEmbedded } from "@/lib/supabase/embed";
import { opsContext, opsSchemaErrorResponse } from "@/lib/ops/http";
import { parseQuantity } from "@/lib/pharmacy/model";
import { isMissingDispenseSchema } from "@/lib/pharmacy/dispense";

const createSchema = z.object({
  randomization_id: z.string().uuid(),
  study_medication_id: z.string().uuid(),
  lot_id: z.string().uuid(),
  quantity: z.union([z.number(), z.string()]),
  directions: z.string().trim().max(400).optional(),
  first_dose_mode: z.enum(["clinic", "home"]),
  first_dose_at: z.string().min(1),
  first_dose_notes: z.string().trim().max(400).optional(),
});

export async function GET() {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const [randRes, rxRes, medsRes, lotsRes] = await Promise.all([
    gate.supabase
      .from("iwrs_randomizations")
      .select(
        "id, protocol_id, patient_id, kit_code, randomized_at, patients(id, first_name, last_name, subject_code), protocols(id, code_name, title)"
      )
      .eq("organization_id", gate.organizationId)
      .order("randomized_at", { ascending: false })
      .limit(80),
    gate.supabase
      .from("prescriptions")
      .select(
        "id, patient_id, protocol_id, kit_code, first_dose_at, first_dose_mode, first_dose_notes, status, quantity, directions, delivered_at, patients(first_name, last_name), protocol_study_medications(name, strength, unit), medication_lots(lot_number)"
      )
      .eq("organization_id", gate.organizationId)
      .order("created_at", { ascending: false })
      .limit(80),
    gate.supabase
      .from("protocol_study_medications")
      .select("id, protocol_id, name, strength, form, unit")
      .eq("organization_id", gate.organizationId)
      .order("name"),
    gate.supabase
      .from("medication_lots")
      .select(
        "id, protocol_id, study_medication_id, lot_number, quantity_on_hand, expires_on"
      )
      .eq("organization_id", gate.organizationId)
      .gt("quantity_on_hand", 0)
      .order("received_at", { ascending: false }),
  ]);

  if (randRes.error) {
    if (isMissingDispenseSchema(randRes.error.message) || /iwrs_randomizations/i.test(randRes.error.message)) {
      return NextResponse.json({
        pending: [],
        dispensed: [],
        medications: medsRes.data ?? [],
        lots: lotsRes.data ?? [],
        hint: randRes.error.message,
      });
    }
    return opsSchemaErrorResponse(randRes.error);
  }

  let prescriptions = rxRes.data ?? [];
  if (rxRes.error && isMissingDispenseSchema(rxRes.error.message)) {
    const legacy = await gate.supabase
      .from("prescriptions")
      .select(
        "id, patient_id, protocol_id, status, quantity, directions, delivered_at, patients(first_name, last_name), protocol_study_medications(name, strength, unit), medication_lots(lot_number)"
      )
      .eq("organization_id", gate.organizationId)
      .order("created_at", { ascending: false })
      .limit(80);
    if (legacy.error) return opsSchemaErrorResponse(legacy.error);
    prescriptions = (legacy.data ?? []).map((row) => ({
      ...row,
      kit_code: "",
      first_dose_at: null,
      first_dose_mode: null,
      first_dose_notes: "",
    }));
  } else if (rxRes.error) {
    return opsSchemaErrorResponse(rxRes.error);
  }

  const dosedKeys = new Set(
    prescriptions
      .filter((row) => row.status === "delivered" && Boolean(row.first_dose_at))
      .map((row) => `${row.patient_id}:${row.protocol_id}`)
  );

  const pending = (randRes.data ?? [])
    .filter((row) => !dosedKeys.has(`${row.patient_id}:${row.protocol_id}`))
    .map((row) => {
      const patient = firstEmbedded(row.patients);
      const protocol = firstEmbedded(row.protocols);
      return {
        randomization_id: row.id,
        patient_id: row.patient_id,
        protocol_id: row.protocol_id,
        kit_code: row.kit_code,
        randomized_at: row.randomized_at,
        patient_name: patient
          ? `${patient.last_name}, ${patient.first_name}`
          : "Paciente",
        subject_code: patient?.subject_code ?? null,
        protocol_code: protocol?.code_name ?? "",
        protocol_title: protocol?.title ?? "",
      };
    });

  return NextResponse.json({
    pending,
    dispensed: prescriptions
      .filter((row) => row.status === "delivered")
      .map((row) => {
        const patient = firstEmbedded(
          (
            row as {
              patients?: {
                first_name: string;
                last_name: string;
              } | { first_name: string; last_name: string }[] | null;
            }
          ).patients
        );
        return {
          ...row,
          patient_name: patient
            ? `${patient.last_name}, ${patient.first_name}`
            : "Paciente",
        };
      }),
    medications: medsRes.data ?? [],
    lots: lotsRes.data ?? [],
  });
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
    return NextResponse.json(
      { error: "Indicá caja, lote, cantidad y cómo se da la primera dosis." },
      { status: 400 }
    );
  }

  const doseAt = new Date(parsed.data.first_dose_at);
  if (Number.isNaN(doseAt.getTime())) {
    return NextResponse.json({ error: "Fecha de primera dosis inválida." }, { status: 400 });
  }

  const { data: randomization, error: randError } = await gate.supabase
    .from("iwrs_randomizations")
    .select("id, organization_id, protocol_id, patient_id, kit_code")
    .eq("id", parsed.data.randomization_id)
    .eq("organization_id", gate.organizationId)
    .maybeSingle();

  if (randError) return opsSchemaErrorResponse(randError);
  if (!randomization?.kit_code) {
    return NextResponse.json(
      { error: "No hay caja IWRS para este paciente. Randomizá o registrá el kit del sponsor." },
      { status: 404 }
    );
  }

  const [medRes, lotRes] = await Promise.all([
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

  if (!medRes.data || !lotRes.data) {
    return NextResponse.json({ error: "Medicamento o lote fuera de tu centro." }, { status: 404 });
  }
  if (
    medRes.data.protocol_id !== randomization.protocol_id ||
    lotRes.data.protocol_id !== randomization.protocol_id ||
    lotRes.data.study_medication_id !== parsed.data.study_medication_id
  ) {
    return NextResponse.json(
      { error: "El lote no corresponde al medicamento de este protocolo." },
      { status: 400 }
    );
  }
  if (Number(lotRes.data.quantity_on_hand) < quantity) {
    return NextResponse.json({ error: "Stock insuficiente en el lote." }, { status: 409 });
  }

  const insert = await gate.supabase
    .from("prescriptions")
    .insert({
      organization_id: gate.organizationId,
      protocol_id: randomization.protocol_id,
      patient_id: randomization.patient_id,
      study_medication_id: parsed.data.study_medication_id,
      lot_id: parsed.data.lot_id,
      quantity,
      directions: parsed.data.directions ?? "",
      status: "draft",
      prescribed_by: gate.ctx.user.id,
      kit_code: randomization.kit_code,
    })
    .select("id")
    .single();

  let prescriptionId = insert.data?.id as string | undefined;
  if (insert.error && isMissingDispenseSchema(insert.error.message)) {
    const retry = await gate.supabase
      .from("prescriptions")
      .insert({
        organization_id: gate.organizationId,
        protocol_id: randomization.protocol_id,
        patient_id: randomization.patient_id,
        study_medication_id: parsed.data.study_medication_id,
        lot_id: parsed.data.lot_id,
        quantity,
        directions: parsed.data.directions ?? "",
        status: "draft",
        prescribed_by: gate.ctx.user.id,
      })
      .select("id")
      .single();
    if (retry.error) return opsSchemaErrorResponse(retry.error);
    prescriptionId = retry.data?.id;
  } else if (insert.error || !prescriptionId) {
    return opsSchemaErrorResponse(insert.error ?? { message: "No se creó la receta." });
  }

  const { data: delivered, error: deliverError } = await gate.supabase.rpc(
    "deliver_study_prescription",
    { p_prescription_id: prescriptionId }
  );
  if (deliverError) {
    return NextResponse.json({ error: deliverError.message }, { status: 409 });
  }

  const firstDose = await gate.supabase
    .from("prescriptions")
    .update({
      first_dose_at: doseAt.toISOString(),
      first_dose_mode: parsed.data.first_dose_mode,
      first_dose_by: gate.ctx.user.id,
      first_dose_notes: parsed.data.first_dose_notes ?? "",
    })
    .eq("id", prescriptionId)
    .select("id, kit_code, first_dose_at, first_dose_mode, status")
    .maybeSingle();

  if (firstDose.error && !isMissingDispenseSchema(firstDose.error.message)) {
    return opsSchemaErrorResponse(firstDose.error);
  }

  return NextResponse.json({
    prescription: firstDose.data ?? delivered,
    kit_code: randomization.kit_code,
  });
}
