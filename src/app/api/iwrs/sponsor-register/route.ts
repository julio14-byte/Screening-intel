import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";
import { iwrsContext, iwrsSchemaErrorResponse } from "@/lib/iwrs/http";
import { isSponsorIwrs, type IwrsConfig } from "@/lib/iwrs/model";

const schema = z.object({
  screening_id: z.string().uuid(),
  kit_code: z.string().trim().min(3).max(40),
  external_id: z.string().trim().max(80).optional().default(""),
  arm_id: z.string().uuid().nullable().optional(),
});

export async function POST(request: Request) {
  const gate = await iwrsContext("screenings:write");
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Indicá el código de kit que devolvió el IRT del sponsor." },
      { status: 400 }
    );
  }

  const { data: screening, error: screeningError } = await gate.supabase
    .from("screenings")
    .select("id, patient_id, protocol_id, status")
    .eq("id", parsed.data.screening_id)
    .maybeSingle();

  if (screeningError) return iwrsSchemaErrorResponse(screeningError);
  if (!screening) {
    return NextResponse.json({ error: "Screening no encontrado." }, { status: 404 });
  }

  const { data: configRow, error: configError } = await gate.supabase
    .from("protocol_iwrs_config")
    .select(
      "protocol_id, organization_id, enabled, blinding, block_size, stratify_gender, source"
    )
    .eq("protocol_id", screening.protocol_id)
    .maybeSingle();

  if (configError) return iwrsSchemaErrorResponse(configError);
  const config = configRow as IwrsConfig | null;
  if (!config?.enabled || !isSponsorIwrs(config)) {
    return NextResponse.json(
      { error: "Este protocolo no está configurado como IWRS del sponsor." },
      { status: 400 }
    );
  }

  const { data, error } = await gate.supabase.rpc("iwrs_register_sponsor_kit", {
    p_screening_id: parsed.data.screening_id,
    p_kit_code: parsed.data.kit_code,
    p_external_id: parsed.data.external_id ?? "",
    p_arm_id: parsed.data.arm_id ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    await recordCustomAuditEvent({
      tableName: "patients",
      recordId: screening.patient_id,
      description: "Registro de kit IWRS del sponsor.",
      metadata: {
        event_type: "iwrs_register_sponsor_kit",
        screening_id: screening.id,
        protocol_id: screening.protocol_id,
        kit: parsed.data.kit_code,
        external_id: parsed.data.external_id,
      },
    });
  } catch {
    /* bitácora no bloquea */
  }

  return NextResponse.json({ assignment: data });
}
