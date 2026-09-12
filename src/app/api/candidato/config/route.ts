import { NextResponse } from "next/server";
import { loadPortalOrganization } from "@/lib/candidato/load-portal-org";
import { createPortalReadClient } from "@/lib/candidato/portal-supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgSlug = searchParams.get("org")?.trim().toLowerCase();
  const protocolCode = searchParams.get("protocolo")?.trim();

  if (!orgSlug) {
    return NextResponse.json({ error: "Parámetro org requerido." }, { status: 400 });
  }

  const portal = await loadPortalOrganization(orgSlug);

  if (portal.status === "not_found") {
    return NextResponse.json(
      { error: "Centro no encontrado. Revisa el código con tu coordinador." },
      { status: 404 }
    );
  }

  if (portal.status === "portal_disabled") {
    return NextResponse.json(
      {
        error:
          "El portal de candidatos no está activo. El investigador debe activarlo y guardar en Configuración → Portal de candidatos.",
      },
      { status: 403 }
    );
  }

  if (portal.status === "error") {
    return NextResponse.json({ error: portal.message }, { status: 503 });
  }

  const org = portal.org;
  const supabase = await createPortalReadClient();

  const { data: protocols, error: protocolsError } = await supabase
    .from("protocols")
    .select("id, title, code_name, status")
    .eq("clinic_id", org.id)
    .eq("status", "active")
    .order("title");

  if (protocolsError) {
    return NextResponse.json({ error: protocolsError.message }, { status: 500 });
  }

  let protocol = null;
  if (protocolCode) {
    protocol =
      (protocols ?? []).find(
        (p) => p.code_name.toLowerCase() === protocolCode.toLowerCase()
      ) ?? null;
    if (!protocol) {
      return NextResponse.json(
        { error: "Estudio no encontrado o no activo." },
        { status: 404 }
      );
    }
  }

  return NextResponse.json({
    organization: {
      name: org.name,
      slug: org.slug,
    },
    protocol,
    protocols: (protocols ?? []).map((p) => ({
      title: p.title,
      code_name: p.code_name,
    })),
  });
}
