import { NextResponse } from "next/server";
import { z } from "zod";
import { handleEhrWebhook } from "@/lib/ehr/handleEhrWebhook";
import { verifyEhrWebhookSignature } from "@/lib/ehr/verifyWebhookSignature";
import {
  createSupabaseAdminClient,
  isAuditAdminConfigured,
} from "@/lib/supabase/server";

const webhookSchema = z.object({
  event_id: z.string().trim().min(1).max(200),
  event_type: z.enum([
    "patient.upsert",
    "profile.update",
    "observation.created",
  ]),
  organization_id: z.string().uuid().optional(),
  ehr_source: z.string().trim().min(1).max(80).optional(),
  patient: z.record(z.string(), z.unknown()),
});

/**
 * Fase 2 — Webhook en tiempo real desde el EHR.
 * Headers: X-Organization-Id, X-EHR-Signature: sha256=<hex>
 */
export async function POST(request: Request) {
  if (!isAuditAdminConfigured()) {
    return NextResponse.json(
      { error: "Webhook EHR no configurado (service role)." },
      { status: 503 }
    );
  }

  const payload = await request.text();
  const organizationId =
    request.headers.get("x-organization-id") ??
    (() => {
      try {
        const json = JSON.parse(payload) as { organization_id?: string };
        return json.organization_id ?? null;
      } catch {
        return null;
      }
    })();

  if (!organizationId) {
    return NextResponse.json(
      { error: "Falta X-Organization-Id o organization_id en el body." },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, ehr_enabled, ehr_webhook_secret, ehr_source")
    .eq("id", organizationId)
    .maybeSingle();

  if (orgError || !org) {
    return NextResponse.json(
      { error: "Organización no encontrada." },
      { status: 404 }
    );
  }

  if (!org.ehr_enabled) {
    return NextResponse.json(
      { error: "Integración EHR deshabilitada para este site." },
      { status: 403 }
    );
  }

  if (!org.ehr_webhook_secret) {
    return NextResponse.json(
      { error: "Webhook EHR sin secreto configurado." },
      { status: 503 }
    );
  }

  const signature = request.headers.get("x-ehr-signature");
  if (
    !verifyEhrWebhookSignature(payload, signature, org.ehr_webhook_secret)
  ) {
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  try {
    const result = await handleEhrWebhook(admin, {
      organizationId: org.id,
      body: parsed.data,
      ehrSource: org.ehr_source,
    });

    if (result.duplicate) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    return NextResponse.json({
      received: true,
      patientId: result.patientId,
      rematchRefreshed: result.rematchRefreshed > 0,
      logId: result.logId,
    });
  } catch (err) {
    console.error("[ehr webhook]", (err as Error)?.message);
    return NextResponse.json(
      { error: (err as Error)?.message ?? "Webhook handler failed" },
      { status: 500 }
    );
  }
}
