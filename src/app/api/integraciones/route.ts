import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCustomAuditEvent } from "@/lib/audit/record-audit-event";
import { integrationContext, integrationSchemaError } from "@/lib/integraciones/http";
import {
  INTEGRATION_KINDS,
  isAllowedWebhookUrl,
  isIntegrationKind,
  newSigningSecret,
} from "@/lib/integraciones/model";

const LIST_SELECT =
  "id, protocol_id, kind, vendor, endpoint_url, active, last_error, last_delivered_at, created_at";

const createSchema = z.object({
  protocol_id: z.string().uuid(),
  kind: z.enum(INTEGRATION_KINDS),
  vendor: z.string().trim().min(2).max(80),
  endpoint_url: z
    .string()
    .trim()
    .url()
    .refine(isAllowedWebhookUrl, {
      message: "El endpoint debe ser HTTPS (o localhost en desarrollo).",
    }),
});

export async function GET(request: Request) {
  const gate = await integrationContext(false);
  if (!gate.ok) return gate.response;

  const url = new URL(request.url);
  const protocolId = url.searchParams.get("protocol_id");
  let query = gate.supabase
    .from("protocol_integrations")
    .select(LIST_SELECT)
    .eq("organization_id", gate.organizationId)
    .order("kind", { ascending: true });

  if (protocolId) {
    const parsed = z.string().uuid().safeParse(protocolId);
    if (!parsed.success) {
      return NextResponse.json({ error: "Protocolo inválido." }, { status: 400 });
    }
    query = query.eq("protocol_id", parsed.data);
  }

  const { data, error } = await query;
  if (error) return integrationSchemaError(error);

  const kind = url.searchParams.get("kind");
  const rows = (data ?? []).filter((row) =>
    kind && isIntegrationKind(kind) ? row.kind === kind : true
  );

  return NextResponse.json({
    integrations: rows,
    inbound_url: "/api/integraciones/inbound",
    signature_header: "X-Crisvia-Signature",
  });
}

export async function POST(request: Request) {
  const gate = await integrationContext(true);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Indicá protocolo, tipo (edc|epro|iwrs), proveedor y URL HTTPS del webhook.",
      },
      { status: 400 }
    );
  }

  const { data: protocol, error: protocolError } = await gate.supabase
    .from("protocols")
    .select("id")
    .eq("id", parsed.data.protocol_id)
    .eq("clinic_id", gate.organizationId)
    .maybeSingle();
  if (protocolError) return integrationSchemaError(protocolError);
  if (!protocol) {
    return NextResponse.json({ error: "Protocolo fuera de tu centro." }, { status: 404 });
  }

  const signingSecret = newSigningSecret();
  const { data, error } = await gate.supabase
    .from("protocol_integrations")
    .upsert(
      {
        organization_id: gate.organizationId,
        protocol_id: parsed.data.protocol_id,
        kind: parsed.data.kind,
        vendor: parsed.data.vendor.trim(),
        endpoint_url: parsed.data.endpoint_url.trim(),
        signing_secret: signingSecret,
        active: true,
        last_error: "",
      },
      { onConflict: "protocol_id,kind" }
    )
    .select(LIST_SELECT)
    .maybeSingle();

  if (error) return integrationSchemaError(error);
  if (!data) {
    return NextResponse.json({ error: "No se pudo guardar la conexión." }, { status: 500 });
  }

  try {
    await recordCustomAuditEvent({
      tableName: "protocol_integrations",
      recordId: data.id as string,
      description: `Conexión ${parsed.data.kind} (${parsed.data.vendor}) configurada.`,
      metadata: {
        event_type: "integration_upsert",
        protocol_id: parsed.data.protocol_id,
        kind: parsed.data.kind,
      },
    });
  } catch {
    /* bitácora no bloquea */
  }

  return NextResponse.json({
    integration: data,
    signing_secret: signingSecret,
    inbound_url: "/api/integraciones/inbound",
    notice:
      "Guardá el secreto ahora. Crisvia lo usa para firmar salidas y para validar el webhook del tercero. No se vuelve a mostrar.",
  });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  active: z.boolean().optional(),
  endpoint_url: z
    .string()
    .trim()
    .url()
    .refine(isAllowedWebhookUrl, {
      message: "El endpoint debe ser HTTPS (o localhost en desarrollo).",
    })
    .optional(),
  vendor: z.string().trim().min(2).max(80).optional(),
});

export async function PATCH(request: Request) {
  const gate = await integrationContext(true);
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.active !== undefined) patch.active = parsed.data.active;
  if (parsed.data.endpoint_url) patch.endpoint_url = parsed.data.endpoint_url;
  if (parsed.data.vendor) patch.vendor = parsed.data.vendor;

  const { data, error } = await gate.supabase
    .from("protocol_integrations")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("organization_id", gate.organizationId)
    .select(LIST_SELECT)
    .maybeSingle();
  if (error) return integrationSchemaError(error);
  if (!data) {
    return NextResponse.json({ error: "Conexión no encontrada." }, { status: 404 });
  }
  return NextResponse.json({ integration: data });
}
