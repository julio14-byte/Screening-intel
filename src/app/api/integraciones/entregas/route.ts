import { NextResponse } from "next/server";
import { z } from "zod";
import { integrationContext, integrationSchemaError } from "@/lib/integraciones/http";

export async function GET(request: Request) {
  const gate = await integrationContext(false);
  if (!gate.ok) return gate.response;

  const protocolId = new URL(request.url).searchParams.get("protocol_id");
  let query = gate.supabase
    .from("integration_deliveries")
    .select(
      "id, protocol_id, event_type, direction, http_status, error, created_at, protocol_integrations(kind, vendor)"
    )
    .eq("organization_id", gate.organizationId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (protocolId) {
    const parsed = z.string().uuid().safeParse(protocolId);
    if (!parsed.success) {
      return NextResponse.json({ error: "Protocolo inválido." }, { status: 400 });
    }
    query = query.eq("protocol_id", parsed.data);
  }

  const { data, error } = await query;
  if (error) return integrationSchemaError(error);
  return NextResponse.json({ deliveries: data ?? [] });
}
