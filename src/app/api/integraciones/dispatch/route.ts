import { NextResponse } from "next/server";
import { z } from "zod";
import { integrationContext, integrationSchemaError } from "@/lib/integraciones/http";
import { dispatchScreeningEvent } from "@/lib/integraciones/dispatch";

const schema = z.object({
  screening_id: z.string().uuid(),
  status: z.enum(["pre_screening", "screening", "randomized", "screen_failure"]),
});

export async function POST(request: Request) {
  const gate = await integrationContext(false);
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

  const { data: screening, error } = await gate.supabase
    .from("screenings")
    .select("id, protocol_id")
    .eq("id", parsed.data.screening_id)
    .maybeSingle();
  if (error) return integrationSchemaError(error);
  if (!screening) {
    return NextResponse.json({ error: "Screening no encontrado." }, { status: 404 });
  }

  const result = await dispatchScreeningEvent(
    gate.supabase,
    gate.organizationId,
    parsed.data.screening_id,
    parsed.data.status
  );

  return NextResponse.json(result);
}
