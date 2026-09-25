import { NextResponse } from "next/server";
import { z } from "zod";
import { opsContext, opsSchemaErrorResponse } from "@/lib/ops/http";
import {
  DIARY_MIGRATION_HINT,
  hashDiaryToken,
  isMissingDispenseSchema,
  newDiaryToken,
} from "@/lib/pharmacy/dispense";

const schema = z.object({
  patient_id: z.string().uuid(),
  protocol_id: z.string().uuid(),
});

export async function POST(request: Request) {
  const gate = await opsContext(true);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Paciente o protocolo inválido." }, { status: 400 });
  }

  const [patientRes, protocolRes] = await Promise.all([
    gate.supabase
      .from("patients")
      .select("id, clinic_id")
      .eq("id", parsed.data.patient_id)
      .eq("clinic_id", gate.organizationId)
      .maybeSingle(),
    gate.supabase
      .from("protocols")
      .select("id, clinic_id")
      .eq("id", parsed.data.protocol_id)
      .eq("clinic_id", gate.organizationId)
      .maybeSingle(),
  ]);

  if (!patientRes.data || !protocolRes.data) {
    return NextResponse.json({ error: "Paciente o protocolo fuera de tu centro." }, { status: 404 });
  }

  await gate.supabase
    .from("dosing_diary_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("patient_id", parsed.data.patient_id)
    .eq("protocol_id", parsed.data.protocol_id)
    .is("revoked_at", null);

  const token = newDiaryToken();
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await gate.supabase.from("dosing_diary_links").insert({
    organization_id: gate.organizationId,
    patient_id: parsed.data.patient_id,
    protocol_id: parsed.data.protocol_id,
    token_hash: hashDiaryToken(token),
    expires_at: expiresAt,
    created_by: gate.ctx.user.id,
  });

  if (error) {
    if (isMissingDispenseSchema(error.message)) {
      return NextResponse.json(
        { error: `${error.message}. ${DIARY_MIGRATION_HINT}` },
        { status: 500 }
      );
    }
    return opsSchemaErrorResponse(error);
  }

  const origin = new URL(request.url).origin;
  return NextResponse.json({
    url: `${origin}/diario/${token}`,
    expires_at: expiresAt,
  });
}
