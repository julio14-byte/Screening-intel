import { NextResponse } from "next/server";
import { z } from "zod";
import { iwrsContext, iwrsSchemaErrorResponse } from "@/lib/iwrs/http";

const schema = z.object({
  protocol_id: z.string().uuid(),
  enabled: z.boolean(),
  blinding: z.enum(["open", "single", "double"]),
  block_size: z.number().int().min(2).max(24),
  stratify_gender: z.boolean(),
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
