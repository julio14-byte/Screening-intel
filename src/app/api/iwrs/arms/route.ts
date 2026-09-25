import { NextResponse } from "next/server";
import { z } from "zod";
import { iwrsContext, iwrsSchemaErrorResponse } from "@/lib/iwrs/http";

const schema = z.object({
  protocol_id: z.string().uuid(),
  code: z.string().trim().min(1).max(12),
  name: z.string().trim().min(1).max(120),
  allocation_weight: z.number().int().min(1).max(9).default(1),
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
    return NextResponse.json({ error: "Datos del brazo inválidos." }, { status: 400 });
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

  const { count } = await gate.supabase
    .from("protocol_arms")
    .select("id", { count: "exact", head: true })
    .eq("protocol_id", parsed.data.protocol_id);

  const { data, error } = await gate.supabase
    .from("protocol_arms")
    .insert({
      organization_id: gate.organizationId,
      protocol_id: parsed.data.protocol_id,
      code: parsed.data.code.toUpperCase(),
      name: parsed.data.name,
      allocation_weight: parsed.data.allocation_weight,
      sort_order: count ?? 0,
    })
    .select(
      "id, organization_id, protocol_id, code, name, allocation_weight, sort_order, created_at"
    )
    .single();

  if (error) {
    const message = error.message.includes("protocol_arms_code_unique")
      ? "Ya existe un brazo con ese código en este protocolo."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ arm: data });
}
