import { NextResponse } from "next/server";
import { z } from "zod";
import {
  isAuditAdminConfigured,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";
import {
  INTEGRATION_KINDS,
  bearerMatches,
  isIntegrationKind,
  signatureMatches,
} from "@/lib/integraciones/model";

const schema = z.object({
  event: z.string().trim().min(3).max(80),
  protocol_code: z.string().trim().min(1).max(40),
  subject_code: z.string().trim().min(1).max(40),
  kind: z.enum(INTEGRATION_KINDS).optional(),
  external_id: z.string().trim().max(120).optional(),
  kit_code: z.string().trim().max(80).optional(),
});

export async function POST(request: Request) {
  if (!isAuditAdminConfigured()) {
    return NextResponse.json(
      { error: "Webhook no configurado (falta service role)." },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = schema.safeParse(parsedJson);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Mandá event, protocol_code y subject_code. El IWRS usa event=iwrs.randomized y kit_code.",
      },
      { status: 400 }
    );
  }

  const kindHint =
    parsed.data.kind ??
    (parsed.data.event.startsWith("iwrs")
      ? "iwrs"
      : parsed.data.event.startsWith("epro")
        ? "epro"
        : parsed.data.event.startsWith("edc")
          ? "edc"
          : null);
  if (!kindHint || !isIntegrationKind(kindHint)) {
    return NextResponse.json(
      { error: "Indicá kind=edc|epro|iwrs o un event que empiece con esos nombres." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: protocols } = await supabase
    .from("protocols")
    .select("id, clinic_id, code_name")
    .eq("code_name", parsed.data.protocol_code);
  if (!protocols?.length) {
    return NextResponse.json({ error: "Protocolo desconocido." }, { status: 404 });
  }

  const { data: integrations } = await supabase
    .from("protocol_integrations")
    .select("id, signing_secret, organization_id, active, protocol_id")
    .in(
      "protocol_id",
      protocols.map((row) => row.id)
    )
    .eq("kind", kindHint)
    .eq("active", true);
  if (!integrations?.length) {
    return NextResponse.json(
      { error: "No hay conexión activa de ese tipo para el protocolo." },
      { status: 404 }
    );
  }

  const signature = request.headers.get("x-crisvia-signature");
  const authorization = request.headers.get("authorization");
  const integration = integrations.find(
    (row) =>
      signatureMatches(row.signing_secret as string, rawBody, signature) ||
      bearerMatches(row.signing_secret as string, authorization)
  );
  if (!integration) {
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  const protocol = protocols.find((row) => row.id === integration.protocol_id);
  if (!protocol) {
    return NextResponse.json({ error: "Protocolo desconocido." }, { status: 404 });
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("clinic_id", protocol.clinic_id)
    .eq("subject_code", parsed.data.subject_code)
    .maybeSingle();
  if (!patient) {
    return NextResponse.json({ error: "Sujeto no encontrado en el centro." }, { status: 404 });
  }

  const { data: screening } = await supabase
    .from("screenings")
    .select("id, status")
    .eq("protocol_id", protocol.id)
    .eq("patient_id", patient.id)
    .maybeSingle();
  if (!screening) {
    return NextResponse.json({ error: "No hay screening de ese sujeto en el protocolo." }, { status: 404 });
  }

  const isIwrsRandomize =
    kindHint === "iwrs" && /randomiz/i.test(parsed.data.event);
  let status = screening.status as string;

  if (isIwrsRandomize) {
    if (screening.status === "screening") {
      const { data: updated, error: updateError } = await supabase
        .from("screenings")
        .update({ status: "randomized" })
        .eq("id", screening.id)
        .eq("status", "screening")
        .select("id")
        .maybeSingle();
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
      if (updated) status = "randomized";
    } else if (screening.status === "randomized") {
      status = "randomized";
    } else {
      return NextResponse.json(
        {
          error:
            "El sujeto no está en Screening. El IWRS del sponsor solo confirma Randomizado desde ese estado.",
        },
        { status: 409 }
      );
    }
  }

  await supabase.from("screening_external_ids").upsert(
    {
      organization_id: integration.organization_id,
      screening_id: screening.id,
      kind: kindHint,
      external_id:
        parsed.data.external_id ?? parsed.data.kit_code ?? parsed.data.subject_code,
      kit_code: parsed.data.kit_code ?? "",
    },
    { onConflict: "screening_id,kind" }
  );

  await supabase.from("integration_deliveries").insert({
    organization_id: integration.organization_id,
    integration_id: integration.id,
    protocol_id: protocol.id,
    screening_id: screening.id,
    event_type: parsed.data.event,
    direction: "inbound",
    payload: parsedJson as Record<string, unknown>,
    http_status: 200,
    error: "",
  });

  return NextResponse.json({
    ok: true,
    screening_id: screening.id,
    status,
  });
}
