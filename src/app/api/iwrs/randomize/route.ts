import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";
import { iwrsContext, iwrsSchemaErrorResponse } from "@/lib/iwrs/http";
import {
  buildPermutedBlock,
  isNeedBlockError,
  type IwrsConfig,
  type ProtocolArm,
} from "@/lib/iwrs/model";

const schema = z.object({
  screening_id: z.string().uuid(),
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
    return NextResponse.json({ error: "Screening inválido." }, { status: 400 });
  }

  const { data: screening, error: screeningError } = await gate.supabase
    .from("screenings")
    .select("id, patient_id, protocol_id, status, patients(gender)")
    .eq("id", parsed.data.screening_id)
    .maybeSingle();

  if (screeningError) return iwrsSchemaErrorResponse(screeningError);
  if (!screening) {
    return NextResponse.json({ error: "Screening no encontrado." }, { status: 404 });
  }

  const [initialConfig, armsRes] = await Promise.all([
    gate.supabase
      .from("protocol_iwrs_config")
      .select(
        "protocol_id, organization_id, enabled, blinding, block_size, stratify_gender, source"
      )
      .eq("protocol_id", screening.protocol_id)
      .maybeSingle(),
    gate.supabase
      .from("protocol_arms")
      .select(
        "id, organization_id, protocol_id, code, name, allocation_weight, sort_order, created_at"
      )
      .eq("protocol_id", screening.protocol_id)
      .order("sort_order"),
  ]);

  let config = initialConfig.data as IwrsConfig | null;
  let configError = initialConfig.error;
  if (configError && /source/i.test(configError.message)) {
    const legacy = await gate.supabase
      .from("protocol_iwrs_config")
      .select(
        "protocol_id, organization_id, enabled, blinding, block_size, stratify_gender"
      )
      .eq("protocol_id", screening.protocol_id)
      .maybeSingle();
    config = legacy.data as IwrsConfig | null;
    configError = legacy.error;
  }

  if (configError) return iwrsSchemaErrorResponse(configError);
  if (armsRes.error) return iwrsSchemaErrorResponse(armsRes.error);

  const arms = (armsRes.data ?? []) as ProtocolArm[];
  if (!config?.enabled) {
    return NextResponse.json(
      { error: "Este protocolo no tiene IWRS activo. Configuralo en el protocolo." },
      { status: 400 }
    );
  }
  if (config.source === "sponsor") {
    return NextResponse.json(
      {
        error:
          "Este protocolo usa el IWRS del sponsor. Registrá en /iwrs el kit que asignó su IRT; Crisvia no llama a Lilly ni a IQVIA.",
      },
      { status: 400 }
    );
  }
  if (arms.length < 2) {
    return NextResponse.json(
      { error: "Cargá al menos dos brazos (por ejemplo activo y placebo) antes de randomizar." },
      { status: 400 }
    );
  }

  const patient = Array.isArray(screening.patients)
    ? screening.patients[0]
    : screening.patients;
  const stratum = config.stratify_gender
    ? String((patient as { gender?: string } | null)?.gender ?? "all")
    : "all";

  const supabase = gate.supabase;
  const screeningId = parsed.data.screening_id;

  async function claim() {
    return supabase.rpc("iwrs_randomize", {
      p_screening_id: screeningId,
    });
  }

  let result = await claim();
  if (result.error && isNeedBlockError(result.error.message)) {
    const armIds = buildPermutedBlock(arms, config.block_size);
    const append = await supabase.rpc("iwrs_append_block", {
      p_protocol_id: screening.protocol_id,
      p_stratum: stratum,
      p_arm_ids: armIds,
    });
    if (append.error) return iwrsSchemaErrorResponse(append.error);
    result = await claim();
  }

  if (result.error) {
    if (isNeedBlockError(result.error.message)) {
      return NextResponse.json(
        { error: "No había cupo en la lista; reintentá la randomización." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  try {
    await recordCustomAuditEvent({
      tableName: "patients",
      recordId: screening.patient_id,
      description: "Randomización IWRS: se asignó kit de estudio.",
      metadata: {
        event_type: "iwrs_randomize",
        screening_id: screening.id,
        protocol_id: screening.protocol_id,
        kit: (result.data as { kit_code?: string } | null)?.kit_code,
      },
    });
  } catch {
    /* la bitácora no bloquea la randomización */
  }

  return NextResponse.json({ assignment: result.data });
}
