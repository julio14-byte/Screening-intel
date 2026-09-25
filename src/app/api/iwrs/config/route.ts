import { NextResponse } from "next/server";
import { z } from "zod";
import { iwrsContext, iwrsSchemaErrorResponse } from "@/lib/iwrs/http";

const schema = z.object({
  protocol_id: z.string().uuid(),
  enabled: z.boolean(),
  blinding: z.enum(["open", "single", "double"]),
  block_size: z.number().int().min(2).max(24),
  stratify_gender: z.boolean(),
  source: z.enum(["site", "sponsor"]).default("site"),
  sponsor_vendor: z
    .enum([
      "",
      "lilly",
      "iqvia",
      "suvoda",
      "medidata",
      "endpoint",
      "signant",
      "almac",
      "4gclinical",
      "other",
    ])
    .default(""),
  sponsor_study_id: z.string().trim().max(80).default(""),
  sponsor_site_id: z.string().trim().max(40).default(""),
});

export async function POST(request: Request) {
  const gate = await iwrsContext("protocols:write");
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de IWRS inválidos." }, { status: 400 });
  }

  const { data: protocol, error: protocolError } = await gate.supabase
    .from("protocols")
    .select("id, clinic_id")
    .eq("id", parsed.data.protocol_id)
    .maybeSingle();

  if (protocolError) return iwrsSchemaErrorResponse(protocolError);
  if (!protocol || protocol.clinic_id !== gate.organizationId) {
    return NextResponse.json({ error: "Protocolo fuera de tu centro." }, { status: 404 });
  }

  if (parsed.data.source === "sponsor" && !parsed.data.sponsor_vendor) {
    return NextResponse.json(
      {
        error:
          "Elegí el IRT del estudio (Lilly no publica un IWRS único: cada protocolo usa el proveedor que ellos designen).",
      },
      { status: 400 }
    );
  }

  const payload = {
    protocol_id: parsed.data.protocol_id,
    organization_id: gate.organizationId,
    enabled: parsed.data.enabled,
    blinding: parsed.data.blinding,
    block_size: parsed.data.block_size,
    stratify_gender: parsed.data.stratify_gender,
    source: parsed.data.source,
    sponsor_vendor: parsed.data.source === "sponsor" ? parsed.data.sponsor_vendor : "",
    sponsor_study_id: parsed.data.sponsor_study_id,
    sponsor_site_id: parsed.data.sponsor_site_id,
  };

  const full = await gate.supabase
    .from("protocol_iwrs_config")
    .upsert(payload, { onConflict: "protocol_id" })
    .select(
      "protocol_id, organization_id, enabled, blinding, block_size, stratify_gender, source, sponsor_vendor, sponsor_study_id, sponsor_site_id, updated_at"
    )
    .single();

  if (
    full.error &&
    /source|sponsor_vendor|sponsor_study_id|sponsor_site_id/i.test(full.error.message)
  ) {
    const { data, error } = await gate.supabase
      .from("protocol_iwrs_config")
      .upsert(
        {
          protocol_id: parsed.data.protocol_id,
          organization_id: gate.organizationId,
          enabled: parsed.data.enabled,
          blinding: parsed.data.blinding,
          block_size: parsed.data.block_size,
          stratify_gender: parsed.data.stratify_gender,
        },
        { onConflict: "protocol_id" }
      )
      .select(
        "protocol_id, organization_id, enabled, blinding, block_size, stratify_gender, updated_at"
      )
      .single();
    if (error) return iwrsSchemaErrorResponse(error);
    return NextResponse.json({ config: data });
  }

  if (full.error) return iwrsSchemaErrorResponse(full.error);
  return NextResponse.json({ config: full.data });
}
