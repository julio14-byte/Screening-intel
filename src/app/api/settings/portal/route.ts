import { NextResponse } from "next/server";
import {
  AuthorizationError,
  requireAuth,
  requirePermission,
} from "@/lib/rbac/require-permission";
import { portalLinksForOrg } from "@/lib/candidato/paths";
import { createPortalReadClient } from "@/lib/candidato/portal-supabase";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const patchSchema = z.object({
  portal_enabled: z.boolean().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: solo minúsculas, números y guiones")
    .optional(),
});

export async function GET() {
  try {
    await requirePermission("patients:read");
  } catch (e) {
    if (e instanceof AuthorizationError) {
      const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }

  const { user } = await requireAuth();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) {
    return NextResponse.json({ error: "Sin organización." }, { status: 404 });
  }

  const { data: org, error } = await supabase
    .from("organizations")
    .select("id, name, slug, portal_enabled")
    .eq("id", membership.organization_id)
    .single();

  if (error || !org) {
    return NextResponse.json({ error: "Organización no encontrada." }, { status: 404 });
  }

  const { data: protocols, error: protocolsError } = await (
    await createPortalReadClient()
  )
    .from("protocols")
    .select("code_name, title, status")
    .eq("clinic_id", org.id)
    .eq("status", "active")
    .order("title");

  if (protocolsError) {
    return NextResponse.json({ error: protocolsError.message }, { status: 500 });
  }

  const slug = org.slug ?? "";
  const links = slug
    ? portalLinksForOrg(slug, protocols ?? [])
    : { siteUrl: "", protocolLinks: [] };

  return NextResponse.json({
    organization: org,
    protocols: protocols ?? [],
    links,
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
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) {
    return NextResponse.json({ error: "Sin organización." }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.portal_enabled !== undefined) {
    updates.portal_enabled = parsed.data.portal_enabled;
  }
  if (parsed.data.slug) {
    updates.slug = parsed.data.slug;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });
  }

  let org: {
    id: string;
    name: string;
    slug: string | null;
    portal_enabled: boolean;
  } | null = null;
  let updateError: { message: string; code?: string } | null = null;

  const { data: userOrg, error: userUpdateError } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", membership.organization_id)
    .select("id, name, slug, portal_enabled")
    .single();

  if (!userUpdateError && userOrg) {
    org = userOrg;
  } else {
    updateError = userUpdateError;
    try {
      const { createSupabaseAdminClient } = await import("@/lib/supabase/server");
      const admin = createSupabaseAdminClient();
      const { data: adminOrg, error: adminError } = await admin
        .from("organizations")
        .update(updates)
        .eq("id", membership.organization_id)
        .select("id, name, slug, portal_enabled")
        .single();
      if (!adminError && adminOrg) {
        org = adminOrg;
        updateError = null;
      } else if (adminError) {
        updateError = adminError;
      }
    } catch {
      /* admin no configurado */
    }
  }

  if (updateError || !org) {
    const err = updateError;
    if (err?.code === "23505") {
      return NextResponse.json({ error: "Ese slug ya está en uso." }, { status: 409 });
    }
    return NextResponse.json(
      {
        error:
          err?.message ??
          "No se pudo guardar. Verifica permisos de investigador y migración 0013.",
      },
      { status: 500 }
    );
  }

  const { data: protocols } = await (await createPortalReadClient())
    .from("protocols")
    .select("code_name")
    .eq("clinic_id", org.id)
    .eq("status", "active");

  const links = portalLinksForOrg(org.slug ?? "", protocols ?? []);

  return NextResponse.json({ organization: org, links });
}
