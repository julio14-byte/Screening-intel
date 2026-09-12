import { NextResponse } from "next/server";
import { z } from "zod";
import { generateEhrWebhookSecret } from "@/lib/ehr/verifyWebhookSignature";
import {
  AuthorizationError,
  requireAuth,
  requirePermission,
} from "@/lib/rbac/require-permission";
import {
  createClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";
import config from "@/config";

const patchSchema = z.object({
  ehr_enabled: z.boolean().optional(),
  ehr_source: z.string().trim().min(1).max(80).optional(),
  regenerate_secret: z.boolean().optional(),
});

async function getMembershipOrgId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return data?.organization_id ?? null;
}

export async function GET() {
  try {
    await requirePermission("roles:manage");
  } catch (e) {
    if (e instanceof AuthorizationError) {
      const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }

  const { user } = await requireAuth();
  const orgId = await getMembershipOrgId(user.id);
  if (!orgId) {
    return NextResponse.json({ error: "Sin organización." }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const { data: org, error } = await admin
    .from("organizations")
    .select("id, name, ehr_enabled, ehr_source, ehr_webhook_secret")
    .eq("id", orgId)
    .single();

  if (error || !org) {
    return NextResponse.json({ error: "Organización no encontrada." }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("ehr_sync_logs")
    .select(
      "id, sync_type, status, patients_created, patients_updated, patients_failed, rematch_refreshed, started_at, completed_at"
    )
    .eq("organization_id", orgId)
    .order("started_at", { ascending: false })
    .limit(10);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? config.app.defaultUrl;

  return NextResponse.json({
    organization: {
      id: org.id,
      name: org.name,
      ehr_enabled: org.ehr_enabled,
      ehr_source: org.ehr_source,
      has_webhook_secret: Boolean(org.ehr_webhook_secret),
      webhook_secret: org.ehr_webhook_secret,
    },
    webhookUrl: `${baseUrl.replace(/\/$/, "")}/api/webhooks/ehr`,
    batchSyncUrl: `${baseUrl.replace(/\/$/, "")}/api/ehr/sync`,
    recentLogs: logs ?? [],
  });
}

export async function PATCH(request: Request) {
  try {
    await requirePermission("roles:manage");
  } catch (e) {
    if (e instanceof AuthorizationError) {
      const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const { user } = await requireAuth();
  const orgId = await getMembershipOrgId(user.id);
  if (!orgId) {
    return NextResponse.json({ error: "Sin organización." }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.ehr_enabled !== undefined) {
    updates.ehr_enabled = parsed.data.ehr_enabled;
  }
  if (parsed.data.ehr_source !== undefined) {
    updates.ehr_source = parsed.data.ehr_source;
  }
  if (parsed.data.regenerate_secret) {
    updates.ehr_webhook_secret = generateEhrWebhookSecret();
  }

  const admin = createSupabaseAdminClient();

  if (
    parsed.data.ehr_enabled === true &&
    !parsed.data.regenerate_secret
  ) {
    const { data: current } = await admin
      .from("organizations")
      .select("ehr_webhook_secret")
      .eq("id", orgId)
      .single();
    if (!current?.ehr_webhook_secret) {
      updates.ehr_webhook_secret = generateEhrWebhookSecret();
    }
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });
  }

  const { data: org, error } = await admin
    .from("organizations")
    .update(updates)
    .eq("id", orgId)
    .select("id, name, ehr_enabled, ehr_source, ehr_webhook_secret")
    .single();

  if (error || !org) {
    return NextResponse.json(
      { error: error?.message ?? "No se pudo guardar." },
      { status: 500 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? config.app.defaultUrl;

  return NextResponse.json({
    organization: {
      id: org.id,
      name: org.name,
      ehr_enabled: org.ehr_enabled,
      ehr_source: org.ehr_source,
      has_webhook_secret: Boolean(org.ehr_webhook_secret),
      webhook_secret: org.ehr_webhook_secret,
    },
    webhookUrl: `${baseUrl.replace(/\/$/, "")}/api/webhooks/ehr`,
    batchSyncUrl: `${baseUrl.replace(/\/$/, "")}/api/ehr/sync`,
  });
}
