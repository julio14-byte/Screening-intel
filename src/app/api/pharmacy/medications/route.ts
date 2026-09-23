import { NextResponse } from "next/server";
import { z } from "zod";
import { opsContext } from "@/lib/ops/http";

const createSchema = z.object({
  protocol_id: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  strength: z.string().trim().max(80).optional(),
  form: z.string().trim().max(80).optional(),
  unit: z.string().trim().max(40).optional(),
});

export async function GET(request: Request) {
  const gate = await opsContext(false);
  if (!gate.ok) return gate.response;

  const protocolId = new URL(request.url).searchParams.get("protocol_id");

  let query = gate.supabase
    .from("protocol_study_medications")
    .select("id, organization_id, protocol_id, name, strength, form, unit, created_at")
    .eq("organization_id", gate.organizationId)
    .order("name");

  if (protocolId) {
    query = query.eq("protocol_id", protocolId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ medications: data ?? [] });
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
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos del medicamento inválidos." }, { status: 400 });
  }

  const { data: protocol, error: protocolError } = await gate.supabase
    .from("protocols")
    .select("id")
    .eq("id", parsed.data.protocol_id)
    .eq("clinic_id", gate.organizationId)
    .maybeSingle();

  if (protocolError) {
    return NextResponse.json({ error: protocolError.message }, { status: 500 });
  }
  if (!protocol) {
    return NextResponse.json({ error: "Protocolo fuera de tu centro." }, { status: 404 });
  }

  const { data, error } = await gate.supabase
    .from("protocol_study_medications")
    .insert({
      organization_id: gate.organizationId,
      protocol_id: parsed.data.protocol_id,
      name: parsed.data.name,
      strength: parsed.data.strength ?? "",
      form: parsed.data.form ?? "",
      unit: parsed.data.unit?.trim() || "unidades",
    })
    .select("id, organization_id, protocol_id, name, strength, form, unit, created_at")
    .single();

  if (error) {
    const message = error.message.includes("protocol_study_medications_unique")
      ? "Ese medicamento ya está en el protocolo."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ medication: data });
}
